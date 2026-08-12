import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import type { NextFunction, Response } from 'express';
import helmet from 'helmet';
import type { AuthenticatedRequest } from './common/interfaces/authenticated-request.interface';
import { RequestLogsService } from './request-logs/request-logs.service';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const requestLogsService = app.get(RequestLogsService);

  app.use(helmet());
  app.enableCors();
  app.use((request: AuthenticatedRequest, response: Response, next: NextFunction) => {
    const startedAt = Date.now();
    const incomingRequestId = request.headers['x-request-id'];
    const requestId =
      typeof incomingRequestId === 'string' && incomingRequestId.trim().length > 0
        ? incomingRequestId.trim()
        : randomUUID();

    request.requestId = requestId;
    response.setHeader('x-request-id', requestId);

    response.on('finish', () => {
      void requestLogsService.create({
        requestId,
        userId: request.user?.id ?? null,
        method: request.method,
        endpoint: request.originalUrl || request.url,
        statusCode: response.statusCode,
        latencyMs: Date.now() - startedAt,
        ipAddress: request.ip || null,
        userAgent:
          typeof request.headers['user-agent'] === 'string'
            ? request.headers['user-agent']
            : null,
      });
    });

    next();
  });
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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('ToolShare API')
    .setDescription('Backend API for the ToolShare MVP marketplace')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  const port = Number(configService.get('PORT') ?? 3000);
  await app.listen(port);
}

void bootstrap();
