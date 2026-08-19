import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WinstonModule } from 'nest-winston';
import {
  createHmac,
  randomUUID,
  timingSafeEqual,
} from 'crypto';
import type { NextFunction, Request, Response } from 'express';
import { static as serveStatic } from 'express';
import { mkdirSync } from 'fs';
import helmet from 'helmet';
import { isAbsolute, relative, resolve } from 'path';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import type { AuthenticatedRequest } from './common/interfaces/authenticated-request.interface';
import { RequestContextService } from './common/request-context.service';
import { RequestLogsService } from './request-logs/request-logs.service';

const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

function createLoggerTransports() {
  const transports: winston.transport[] = [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.ms(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ];

  if (process.env['LOG_TO_FILES'] === 'true') {
    const logsRoot = resolve(process.env['LOGS_DIR'] ?? 'logs');
    mkdirSync(logsRoot, { recursive: true });
    const fileOptions = {
      dirname: logsRoot,
      maxsize: 10 * 1024 * 1024,
      maxFiles: 5,
      tailable: true,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json(),
      ),
    };

    transports.push(
      new winston.transports.File({
        ...fileOptions,
        filename: 'error.log',
        level: 'error',
      }),
      new winston.transports.File({
        ...fileOptions,
        filename: 'combined.log',
      }),
    );
  }

  return transports;
}

function safeRequestId(value: string | string[] | undefined) {
  return typeof value === 'string' && REQUEST_ID_PATTERN.test(value)
    ? value
    : randomUUID();
}

function isSafeSecureFilePath(storageRoot: string, key: string) {
  if (!key.startsWith('secure/') || key.includes('\\')) {
    return false;
  }

  const targetPath = resolve(storageRoot, key);
  const secureRoot = resolve(storageRoot, 'secure');
  const relativePath = relative(secureRoot, targetPath);

  return !relativePath.startsWith('..') && !isAbsolute(relativePath);
}

function verifySignedFileRequest(
  request: Request,
  storageRoot: string,
  signingSecret: string,
) {
  const key = typeof request.query['key'] === 'string' ? request.query['key'] : '';
  const signature =
    typeof request.query['signature'] === 'string'
      ? request.query['signature']
      : '';
  const expiresValue =
    typeof request.query['expires'] === 'string'
      ? request.query['expires']
      : '';
  const expires = Number(expiresValue);
  const now = Math.floor(Date.now() / 1000);

  if (
    !Number.isSafeInteger(expires) ||
    expires <= now ||
    expires - now > 24 * 60 * 60 ||
    !/^[a-f0-9]{64}$/.test(signature) ||
    !isSafeSecureFilePath(storageRoot, key)
  ) {
    return null;
  }

  const expectedSignature = createHmac('sha256', signingSecret)
    .update(`${key}:${expires}`)
    .digest('hex');
  const providedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return null;
  }

  return resolve(storageRoot, key);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    rawBody: true,
    logger: WinstonModule.createLogger({
      transports: createLoggerTransports(),
    }),
  });
  app.enableShutdownHooks();

  const configService = app.get(ConfigService);
  const requestLogsService = app.get(RequestLogsService);
  const requestContextService = app.get(RequestContextService);
  const uploadsRoot = resolve(
    configService.get<string>('UPLOADS_DIR') ?? resolve(process.cwd(), 'uploads'),
  );
  const signingSecret =
    configService.get<string>('STORAGE_SIGNING_SECRET') ??
    configService.getOrThrow<string>('JWT_ACCESS_SECRET');

  mkdirSync(resolve(uploadsRoot, 'assets'), { recursive: true });
  mkdirSync(resolve(uploadsRoot, 'secure'), { recursive: true });

  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );

  const corsOrigins =
    configService
      .get<string>('CORS_ORIGINS')
      ?.split(',')
      .map((origin) => origin.trim())
      .filter(Boolean) ?? [];
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (error: Error | null, allow?: boolean) => void,
    ) => {
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin is not allowed by CORS'));
    },
    credentials: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.set('trust proxy', 1);
  app.use(
    '/files/assets',
    serveStatic(resolve(uploadsRoot, 'assets'), {
      dotfiles: 'deny',
      fallthrough: false,
      immutable: false,
      index: false,
      maxAge: '7d',
    }),
  );
  app.use(
    '/files/signed',
    (request: Request, response: Response, next: NextFunction) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.sendStatus(405);
        return;
      }

      const targetPath = verifySignedFileRequest(
        request,
        uploadsRoot,
        signingSecret,
      );

      if (!targetPath) {
        response.sendStatus(403);
        return;
      }

      response.setHeader('Cache-Control', 'private, no-store');
      response.sendFile(targetPath, (error) => {
        if (error && !response.headersSent) {
          next(error);
        }
      });
    },
  );

  app.use(
    (
      request: AuthenticatedRequest,
      response: Response,
      next: NextFunction,
    ) => {
      const startedAt = Date.now();
      const requestId = safeRequestId(request.headers['x-request-id']);

      request.requestId = requestId;
      response.setHeader('x-request-id', requestId);
      const userAgent =
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent'].slice(0, 512)
          : null;
      const ipAddress = request.ip || null;

      requestContextService.run(
        {
          requestId,
          ipAddress,
          userAgent,
        },
        () => {
          response.on('finish', () => {
            void requestLogsService
              .create({
                requestId,
                userId: request.user?.id ?? null,
                method: request.method,
                endpoint: (request.originalUrl || request.url).slice(0, 1024),
                statusCode: response.statusCode,
                latencyMs: Date.now() - startedAt,
                ipAddress,
                userAgent,
              })
              .catch(() => undefined);
          });

          next();
        },
      );
    },
  );

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  if (configService.get<boolean>('SWAGGER_ENABLED')) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Borrow Hub API')
      .setDescription('Backend API for the Borrow Hub rental marketplace')
      .setVersion('1.0.0')
      .addBearerAuth()
      .build();
    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('api/docs', app, swaggerDocument);
  }

  const port = configService.getOrThrow<number>('PORT');
  const host = configService.getOrThrow<string>('HOST');
  await app.listen(port, host);
}

void bootstrap();
