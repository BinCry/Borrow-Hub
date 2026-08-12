import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import {
  CreateAddressDto,
  UpdateAddressDto,
  UpdateProfileDto,
} from './users.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
}

