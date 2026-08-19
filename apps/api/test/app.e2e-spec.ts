import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AuthController } from '../src/auth/auth.controller';
import { AuthService } from '../src/auth/auth.service';
import { PrismaService } from '../src/database/prisma.service';
import { HealthController } from '../src/health/health.controller';
import { UsersController } from '../src/users/users.controller';
import { UsersService } from '../src/users/users.service';

describe('Borrow Hub HTTP boundary (e2e)', () => {
  let app: INestApplication;
  const prisma = {
    $queryRaw: jest.fn(),
  };
  const authService = {
    login: jest.fn(),
    register: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    me: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };
  const usersService = {
    requestAccountDeletion: jest.fn(),
    confirmAccountDeletion: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [HealthController, AuthController, UsersController],
      providers: [
        { provide: PrismaService, useValue: prisma },
        { provide: AuthService, useValue: authService },
        { provide: UsersService, useValue: usersService },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns a healthy response when PostgreSQL responds', async () => {
    prisma.$queryRaw.mockResolvedValue([{ '?column?': 1 }]);

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200);

    expect(response.body).toMatchObject({
      status: 'ok',
      database: 'up',
    });
    expect(response.body.timestamp).toEqual(expect.any(String));
  });

  it('returns 503 instead of reporting a false healthy state', async () => {
    prisma.$queryRaw.mockRejectedValue(new Error('database unavailable'));

    const response = await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(503);

    expect(response.body).toMatchObject({
      status: 'degraded',
      database: 'down',
    });
  });

  it('validates and forwards a login request', async () => {
    authService.login.mockResolvedValue({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ identifier: '  user@example.com  ', password: 'Password123' })
      .expect(201)
      .expect({ accessToken: 'access-token', refreshToken: 'refresh-token' });

    expect(authService.login).toHaveBeenCalledWith({
      identifier: 'user@example.com',
      password: 'Password123',
    });
  });

  it('rejects undeclared request fields at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        identifier: 'user@example.com',
        password: 'Password123',
        isAdmin: true,
      })
      .expect(400);

    expect(authService.login).not.toHaveBeenCalled();
  });

  it('accepts a valid public account deletion request without exposing account existence', async () => {
    usersService.requestAccountDeletion.mockResolvedValue({ success: true });

    await request(app.getHttpServer())
      .post('/api/v1/users/account-deletion/request')
      .send({ email: 'user@example.com' })
      .expect(201)
      .expect({ success: true });

    expect(usersService.requestAccountDeletion).toHaveBeenCalledWith(
      'user@example.com',
    );
  });

  it('rejects malformed account deletion tokens at the HTTP boundary', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/users/account-deletion/confirm')
      .send({ token: 'too-short' })
      .expect(400);

    expect(usersService.confirmAccountDeletion).not.toHaveBeenCalled();
  });
});
