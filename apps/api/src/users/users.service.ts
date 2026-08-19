import {
  ForbiddenException,
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AssetStatus, RentalStatus, UserStatus } from '@prisma/client';
import { randomUUID } from 'crypto';
import { createHash, randomBytes } from 'crypto';
import {
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './users.dto';
import { StorageService } from '../storage/storage.service';
import { MailService } from '../mail/mail.service';
import { ConfigService } from '@nestjs/config';

const ACCOUNT_DELETION_TTL_MS = 60 * 60 * 1000;

function hashAccountDeletionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storageService: StorageService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  async requestAccountDeletion(rawEmail: string) {
    const email = rawEmail.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, fullName: true, status: true },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return { success: true };
    }

    const token = randomBytes(32).toString('hex');
    const tokenHash = hashAccountDeletionToken(token);
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        accountDeletionTokenHash: tokenHash,
        accountDeletionExpiresAt: new Date(Date.now() + ACCOUNT_DELETION_TTL_MS),
      },
    });

    const delivered = await this.mailService.sendAccountDeletionConfirmation({
      email: user.email,
      fullName: user.fullName,
      token,
    });

    if (!delivered) {
      await this.prisma.user.updateMany({
        where: { id: user.id, accountDeletionTokenHash: tokenHash },
        data: {
          accountDeletionTokenHash: null,
          accountDeletionExpiresAt: null,
        },
      });

      if (this.configService.get<string>('NODE_ENV') !== 'production') {
        return { success: true, developmentDeletionToken: token };
      }
    }

    return { success: true };
  }

  async confirmAccountDeletion(token: string) {
    const tokenHash = hashAccountDeletionToken(token);
    const user = await this.prisma.user.findUnique({
      where: { accountDeletionTokenHash: tokenHash },
      select: {
        id: true,
        status: true,
        accountDeletionExpiresAt: true,
      },
    });

    if (
      !user ||
      user.status !== UserStatus.ACTIVE ||
      !user.accountDeletionExpiresAt ||
      user.accountDeletionExpiresAt <= new Date()
    ) {
      throw new BadRequestException('Account deletion link is invalid or expired');
    }

    return this.deleteAccount(user.id, tokenHash);
  }

  getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        status: true,
        trustScore: true,
        createdAt: true,
        updatedAt: true,
        verification: {
          select: {
            provider: true,
            verificationStatus: true,
            documentType: true,
            maskedDocumentNumber: true,
            verifiedAt: true,
          },
        },
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: {
        fullName: dto.fullName,
        avatarUrl: dto.avatarUrl,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        fullName: true,
        avatarUrl: true,
        dateOfBirth: true,
        updatedAt: true,
      },
    });
  }

  listAddresses(userId: string) {
    return this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.userAddress.create({
        data: {
          userId,
          ...dto,
        },
      });
    });
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Address does not belong to current user');
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.userAddress.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.userAddress.update({
        where: { id: addressId },
        data: dto,
      });
    });
  }

  async removeAddress(userId: string, addressId: string) {
    const address = await this.prisma.userAddress.findUnique({
      where: { id: addressId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    if (address.userId !== userId) {
      throw new ForbiddenException('Address does not belong to current user');
    }

    await this.prisma.userAddress.delete({
      where: { id: addressId },
    });

    return { success: true };
  }

  async deleteAccount(userId: string, expectedDeletionTokenHash?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        rentalsAsOwner: {
          where: {
            status: {
              notIn: [
                RentalStatus.DECLINED,
                RentalStatus.COMPLETED,
                RentalStatus.CANCELLED,
                RentalStatus.EXPIRED,
              ],
            },
          },
        },
        rentalsAsRenter: {
          where: {
            status: {
              notIn: [
                RentalStatus.DECLINED,
                RentalStatus.COMPLETED,
                RentalStatus.CANCELLED,
                RentalStatus.EXPIRED,
              ],
            },
          },
        },
        verification: {
          select: {
            documentFrontKey: true,
            documentBackKey: true,
            selfieKey: true,
          },
        },
      },
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new NotFoundException('User not found');
    }

    if (user.rentalsAsOwner.length > 0 || user.rentalsAsRenter.length > 0) {
      throw new BadRequestException('Cannot delete account with active rentals. Please complete or cancel them first.');
    }

    const uuid = randomUUID();
    const sensitiveDocumentKeys = [
      user.verification?.documentFrontKey,
      user.verification?.documentBackKey,
      user.verification?.selfieKey,
    ].filter((key): key is string => Boolean(key));

    await Promise.all(
      sensitiveDocumentKeys.map((key) =>
        this.storageService.deleteSensitiveDocument(key),
      ),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.asset.updateMany({
        where: { ownerId: userId, status: AssetStatus.ACTIVE },
        data: { status: AssetStatus.PAUSED },
      });

      const deleted = await tx.user.updateMany({
        where: {
          id: userId,
          status: UserStatus.ACTIVE,
          ...(expectedDeletionTokenHash
            ? { accountDeletionTokenHash: expectedDeletionTokenHash }
            : {}),
        },
        data: {
          status: UserStatus.DELETED,
          email: `deleted_${uuid}@toolshare.local`,
          phone: `deleted_${uuid}`,
          fullName: 'Deleted User',
          avatarUrl: null,
          dateOfBirth: null,
          emailVerifiedAt: null,
          phoneVerifiedAt: null,
          lastLoginAt: null,
          trustScore: 0,
          passwordHash: '',
          refreshTokenHash: null,
          passwordResetTokenHash: null,
          passwordResetExpiresAt: null,
          accountDeletionTokenHash: null,
          accountDeletionExpiresAt: null,
        },
      });

      if (deleted.count !== 1) {
        throw new BadRequestException('Account deletion request is no longer valid');
      }

      await tx.userAddress.deleteMany({ where: { userId } });
      await tx.userVerification.deleteMany({ where: { userId } });
      await tx.favoriteAsset.deleteMany({ where: { userId } });
      await tx.notification.deleteMany({ where: { userId } });
      await tx.conversationMember.deleteMany({ where: { userId } });
      await tx.userRole.deleteMany({ where: { userId } });

      return { success: true, message: 'Account has been securely deleted' };
    });

    return result;
  }
}
