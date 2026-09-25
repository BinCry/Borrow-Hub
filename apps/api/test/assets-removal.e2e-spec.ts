import { INestApplication, UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { AssetStatus, RoleName } from '@prisma/client';
import request = require('supertest');
import { AssetsController } from '../src/assets/assets.controller';
import { AssetsService } from '../src/assets/assets.service';
import { AuthService } from '../src/auth/auth.service';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { AllExceptionsFilter } from '../src/common/filters/all-exceptions.filter';
import { FavoritesController } from '../src/favorites/favorites.controller';
import { FavoritesService } from '../src/favorites/favorites.service';

// Exercise real controllers, guards, DTO validation and services over HTTP.
// Only persistence and external side effects are replaced in this suite.
describe('Asset removal HTTP workflow', () => {
  let app: INestApplication;
  let asset: any;
  const audit = { create: jest.fn() };
  const notifications = { createMany: jest.fn() };
  const users = {
    owner: { id: 'owner-1', roles: [RoleName.USER] },
    other: { id: 'other-1', roles: [RoleName.USER] },
    admin: { id: 'admin-1', roles: [RoleName.ADMIN] },
    moderator: { id: 'moderator-1', roles: [RoleName.MODERATOR] },
    support: { id: 'support-1', roles: [RoleName.CUSTOMER_SUPPORT] },
  };
  const matches = (where: any = {}) => {
    if (!asset || (where.ownerId && where.ownerId !== asset.ownerId)) return false;
    if (where.NOT?.status === asset.status) return false;
    if (typeof where.status === 'string') return where.status === asset.status;
    return !where.status?.notIn?.includes(asset.status);
  };
  const prisma = {
    asset: {
      findUnique: jest.fn(async ({ where }) => where.id === asset?.id ? { ...asset } : null),
      findMany: jest.fn(async ({ where }) => matches(where) ? [{ ...asset }] : []),
      count: jest.fn(async ({ where }) => matches(where) ? 1 : 0),
      update: jest.fn(async ({ data }) => {
        asset = { ...asset, ...data };
        return { ...asset };
      }),
    },
    favoriteAsset: {
      findUnique: jest.fn(async () => null),
      findMany: jest.fn(async ({ where }) => matches(where.asset)
        ? [{ assetId: asset.id, asset: { ...asset } }] : []),
    },
    review: { groupBy: jest.fn(async () => []) },
    rentalRequest: { groupBy: jest.fn(async () => []) },
  };

  beforeAll(async () => {
    const service = new AssetsService(
      prisma as never, { track: jest.fn() } as never, audit as never,
      notifications as never, {} as never, {} as never,
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [AssetsController, FavoritesController],
      providers: [
        { provide: AssetsService, useValue: service },
        { provide: FavoritesService, useValue: new FavoritesService(prisma as never) },
        { provide: AuthService, useValue: {
          validateAccessToken: jest.fn(async (token: keyof typeof users) => {
            if (!users[token]) throw new UnauthorizedException();
            return users[token];
          }),
        } },
        { provide: APP_GUARD, useClass: AuthGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.useGlobalFilters(new AllExceptionsFilter());
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }));
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    asset = {
      id: 'asset-1', ownerId: users.owner.id, title: 'Camera',
      status: AssetStatus.ACTIVE, images: [], accessories: [],
      owner: { id: users.owner.id, fullName: 'Owner' },
      createdAt: new Date(), latitude: null, longitude: null,
    };
  });

  afterAll(async () => { await app.close(); });

  it.each(['owner', 'admin', 'moderator'])('%s deletes a listing and fresh lists no longer return it', async (actor) => {
    await request(app.getHttpServer()).get('/assets').expect(200)
      .expect(({ body }) => expect(body.data).toHaveLength(1));

    await request(app.getHttpServer()).delete('/assets/asset-1')
      .auth(actor, { type: 'bearer' })
      .send(actor === 'owner' ? {} : { reason: '  Sai thông tin  ' })
      .expect(200).expect(({ body }) => expect(body.status).toBe(AssetStatus.ARCHIVED));

    // No physical deletion: existing rentals can still reference this asset.
    expect(asset.id).toBe('asset-1');
    expect(audit.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'asset.remove' }));
    if (actor === 'owner') {
      expect(notifications.createMany).not.toHaveBeenCalled();
    } else {
      expect(notifications.createMany).toHaveBeenCalledWith(['owner-1'], expect.objectContaining({
        content: 'Bài đăng "Camera" đã bị xóa. Lý do: Sai thông tin',
      }));
    }

    for (const query of [{}, { includeAllStatuses: 'true' }, { status: 'SUSPENDED' }, { status: 'ARCHIVED' }, { sort: 'highest-rating' }]) {
      await request(app.getHttpServer()).get('/assets').query(query).auth('admin', { type: 'bearer' })
        .expect(200).expect(({ body }) => {
          expect(body.data).toEqual([]);
          expect(body.pagination.total).toBe(0);
        });
    }
    await request(app.getHttpServer()).get('/assets').expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
    await request(app.getHttpServer()).get('/assets/my').auth('owner', { type: 'bearer' }).expect(200).expect([]);
    await request(app.getHttpServer()).get('/favorites').auth('other', { type: 'bearer' }).expect(200).expect([]);
    await request(app.getHttpServer()).get('/assets/asset-1').expect(404);
    await request(app.getHttpServer()).patch('/assets/asset-1/moderate').auth('admin', { type: 'bearer' })
      .send({ status: 'ACTIVE' }).expect(409);
    await request(app.getHttpServer()).patch('/assets/asset-1').auth('admin', { type: 'bearer' })
      .send({ title: 'Republish' }).expect(409);
    await request(app.getHttpServer()).delete('/assets/asset-1').auth(actor, { type: 'bearer' }).send({}).expect(200);
    expect(prisma.asset.update).toHaveBeenCalledTimes(1);
  });

  it.each(['other', 'support'])('rejects deletion by %s without ownership or moderation rights', async (actor) => {
    await request(app.getHttpServer()).delete('/assets/asset-1').auth(actor, { type: 'bearer' })
      .send({ reason: 'Test' }).expect(403);
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it('requires authentication and a reason for administrative deletion', async () => {
    await request(app.getHttpServer()).delete('/assets/asset-1').send({}).expect(401);
    await request(app.getHttpServer()).delete('/assets/asset-1').auth('admin', { type: 'bearer' })
      .send({ reason: '   ' }).expect(400);
    await request(app.getHttpServer()).delete('/assets/asset-1').auth('admin', { type: 'bearer' })
      .send({ reason: 'x'.repeat(1001) }).expect(400);
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it('does not give owners access to moderation or to another asset', async () => {
    await request(app.getHttpServer()).patch('/assets/asset-1/moderate').auth('owner', { type: 'bearer' })
      .send({ status: 'ACTIVE' }).expect(403);
    await request(app.getHttpServer()).delete('/assets/missing').auth('owner', { type: 'bearer' })
      .send({}).expect(404);
    expect(prisma.asset.update).not.toHaveBeenCalled();
  });

  it('supports administrative archiving through the legacy moderation route', async () => {
    await request(app.getHttpServer()).patch('/assets/asset-1/moderate').auth('admin', { type: 'bearer' })
      .send({ status: 'ARCHIVED', reason: 'Sai thông tin' }).expect(200)
      .expect(({ body }) => expect(body.status).toBe('ARCHIVED'));
    await request(app.getHttpServer()).get('/assets').query({ includeAllStatuses: 'true', hideRemoved: 'true' })
      .auth('admin', { type: 'bearer' }).expect(200)
      .expect(({ body }) => expect(body.data).toEqual([]));
  });

  it('returns production-shaped errors for missing routes and denied deletion', async () => {
    await request(app.getHttpServer()).delete('/missing-route').expect(404)
      .expect(({ body }) => expect(body).toMatchObject({ success: false, error: { message: 'Cannot DELETE /missing-route' } }));
    await request(app.getHttpServer()).delete('/assets/asset-1').auth('other', { type: 'bearer' })
      .send({}).expect(403)
      .expect(({ body }) => expect(body.error.message).toBe('Bạn không có quyền xóa bài đăng này.'));
  });
});
