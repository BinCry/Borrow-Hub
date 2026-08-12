import {
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { FavoritesService } from './favorites.service';

describe('FavoritesService', () => {
  const currentUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'User One',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const prisma = {
    asset: {
      findUnique: jest.fn(),
    },
    favoriteAsset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
  };

  let service: FavoritesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FavoritesService(prisma as never);
  });

  it('creates a favorite for an active asset', async () => {
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      status: AssetStatus.ACTIVE,
    });
    prisma.favoriteAsset.findUnique.mockResolvedValue(null);
    prisma.favoriteAsset.create.mockResolvedValue({
      userId: currentUser.id,
      assetId: 'asset-1',
    });

    const result = await service.add('asset-1', currentUser);

    expect(prisma.favoriteAsset.create).toHaveBeenCalled();
    expect(result).toEqual({
      userId: currentUser.id,
      assetId: 'asset-1',
    });
  });

  it('rejects favoriting own asset', async () => {
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      ownerId: currentUser.id,
      status: AssetStatus.ACTIVE,
    });

    await expect(service.add('asset-1', currentUser)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });

  it('rejects duplicate favorite', async () => {
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      status: AssetStatus.ACTIVE,
    });
    prisma.favoriteAsset.findUnique.mockResolvedValue({
      userId: currentUser.id,
      assetId: 'asset-1',
    });

    await expect(service.add('asset-1', currentUser)).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('removes an existing favorite', async () => {
    prisma.favoriteAsset.findUnique.mockResolvedValue({
      userId: currentUser.id,
      assetId: 'asset-1',
    });
    prisma.favoriteAsset.delete.mockResolvedValue({});

    const result = await service.remove('asset-1', currentUser);

    expect(prisma.favoriteAsset.delete).toHaveBeenCalledWith({
      where: {
        userId_assetId: {
          userId: currentUser.id,
          assetId: 'asset-1',
        },
      },
    });
    expect(result).toEqual({ success: true });
  });

  it('fails removing a missing favorite', async () => {
    prisma.favoriteAsset.findUnique.mockResolvedValue(null);

    await expect(service.remove('asset-1', currentUser)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
