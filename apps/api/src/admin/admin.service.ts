import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UpdateSystemConfigDto, UpdateUserStatusDto } from './admin.dto';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      activeListings,
      totalRentals,
      completedRentals,
      openIssues,
      totalGMV,
      totalPayouts,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.userVerification.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      this.prisma.user.count({
        where: { status: 'SUSPENDED' },
      }),
      this.prisma.asset.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.rentalRequest.count(),
      this.prisma.rentalRequest.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.rentalRequest.count({
        where: { status: 'DISPUTED' },
      }),
      this.prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: 'SUCCESS',
        },
      }),
      this.prisma.payout.aggregate({
        _sum: {
          netAmount: true,
        },
        where: {
          status: 'PAID',
        },
      }),
    ]);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
      },
      marketplace: {
        activeListings,
        totalRentals,
        completedRentals,
        openIssues,
      },
      finance: {
        gmv: totalGMV._sum.amount ?? 0,
        paidOut: totalPayouts._sum.netAmount ?? 0,
      },
    };
  }

  listUsers() {
    return this.prisma.user.findMany({
      include: {
        verification: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async updateUserStatus(
    userId: string,
    dto: UpdateUserStatusDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.id === userId && dto.status !== 'ACTIVE') {
      throw new BadRequestException('You cannot disable your own account');
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
    });

    await this.auditService.create({
      actorId: actor.id,
      action: 'admin.user-status.update',
      entityType: 'user',
      entityId: userId,
      beforeData: { status: existing.status },
      afterData: { status: updated.status },
    });

    return updated;
  }

  listSystemConfigs() {
    return this.prisma.systemConfig.findMany({
      orderBy: [{ key: 'asc' }],
    });
  }

  async updateSystemConfig(
    key: string,
    dto: UpdateSystemConfigDto,
    actor: AuthenticatedUser,
  ) {
    const existing = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    if (!existing) {
      throw new NotFoundException('System config not found');
    }

    const updated = await this.prisma.systemConfig.update({
      where: { key },
      data: {
        value: dto.value,
        description: dto.description ?? existing.description,
      },
    });

    await this.auditService.create({
      actorId: actor.id,
      action: 'admin.system-config.update',
      entityType: 'system_config',
      entityId: updated.id,
      beforeData: { value: existing.value, description: existing.description },
      afterData: { value: updated.value, description: updated.description },
    });

    return updated;
  }

  getAuditLogs() {
    return this.prisma.auditLog.findMany({
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    });
  }
}

