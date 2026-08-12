import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class FavoritesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(currentUser: AuthenticatedUser) {
    return this.prisma.favoriteAsset.findMany({
      where: {
        userId: currentUser.id,
      },
      include: {
        asset: {
          include: {
            category: true,
            images: {
              orderBy: [{ sortOrder: 'asc' }],
            },
            owner: {
              select: {
                id: true,
                fullName: true,
                trustScore: true,
              },
            },
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async add(assetId: string, currentUser: AuthenticatedUser) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset || asset.status !== AssetStatus.ACTIVE) {
      throw new NotFoundException('Asset not found');
    }

    if (asset.ownerId === currentUser.id) {
      throw new ForbiddenException('You cannot favorite your own asset');
    }

    const existing = await this.prisma.favoriteAsset.findUnique({
      where: {
        userId_assetId: {
          userId: currentUser.id,
          assetId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Asset is already in favorites');
    }

    return this.prisma.favoriteAsset.create({
      data: {
        userId: currentUser.id,
        assetId,
      },
      include: {
        asset: {
          include: {
            images: {
              orderBy: [{ sortOrder: 'asc' }],
            },
          },
        },
      },
    });
  }

  async remove(assetId: string, currentUser: AuthenticatedUser) {
    const existing = await this.prisma.favoriteAsset.findUnique({
      where: {
        userId_assetId: {
          userId: currentUser.id,
          assetId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('Favorite asset not found');
    }

    await this.prisma.favoriteAsset.delete({
      where: {
        userId_assetId: {
          userId: currentUser.id,
          assetId,
        },
      },
    });

    return { success: true };
  }
}
