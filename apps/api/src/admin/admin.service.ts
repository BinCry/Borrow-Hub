import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import { DisputeStatus, RoleName, UserStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  CreateInternalUserDto,
  UpdateSystemConfigDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './admin.dto';

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
      this.prisma.dispute.count({
        where: {
          status: {
            in: [
              DisputeStatus.OPEN,
              DisputeStatus.WAITING_RESPONSE,
              DisputeStatus.UNDER_REVIEW,
            ],
          },
        },
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

  listRoles() {
    return this.prisma.role.findMany({
      include: {
        rolePermissions: {
          include: {
            permission: true,
          },
        },
      },
      orderBy: [{ name: 'asc' }],
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

  async updateUserRoles(
    userId: string,
    dto: UpdateUserRolesDto,
    actor: AuthenticatedUser,
  ) {
    if (actor.id === userId && !dto.roles.includes(RoleName.SUPER_ADMIN)) {
      throw new BadRequestException('You cannot remove your own super admin role');
    }

    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const normalizedRoles = [...new Set(dto.roles)];
    const roleRecords = await this.prisma.role.findMany({
      where: {
        name: {
          in: normalizedRoles,
        },
      },
    });

    if (roleRecords.length !== normalizedRoles.length) {
      throw new BadRequestException('One or more roles are invalid');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userRole.deleteMany({
        where: {
          userId,
        },
      });

      await tx.userRole.createMany({
        data: roleRecords.map((role) => ({
          userId,
          roleId: role.id,
        })),
      });

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          verification: true,
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });
    });

    await this.auditService.create({
      actorId: actor.id,
      action: 'admin.user-roles.update',
      entityType: 'user',
      entityId: userId,
      beforeData: {
        roles: existingUser.userRoles.map((userRole) => userRole.role.name),
      },
      afterData: {
        roles: updated.userRoles.map((userRole) => userRole.role.name),
      },
    });

    return updated;
  }

  async createInternalUser(dto: CreateInternalUserDto, actor: AuthenticatedUser) {
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: dto.email }, { phone: dto.phone }],
      },
    });

    if (existingUser) {
      throw new ConflictException('Email or phone already exists');
    }

    const normalizedRoles = [...new Set(dto.roles)];
    if (normalizedRoles.includes(RoleName.USER) && normalizedRoles.length === 1) {
      throw new BadRequestException('Internal user must include at least one staff role');
    }

    const roleRecords = await this.prisma.role.findMany({
      where: {
        name: {
          in: normalizedRoles,
        },
      },
    });

    if (roleRecords.length !== normalizedRoles.length) {
      throw new BadRequestException('One or more roles are invalid');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    const created = await this.prisma.user.create({
      data: {
        fullName: dto.fullName,
        email: dto.email,
        phone: dto.phone,
        passwordHash,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : null,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        phoneVerifiedAt: new Date(),
        userRoles: {
          create: roleRecords.map((role) => ({
            roleId: role.id,
          })),
        },
        verification: {
          create: {
            provider: 'internal-admin',
            verificationStatus: VerificationStatus.VERIFIED,
          },
        },
      },
      include: {
        verification: true,
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    await this.auditService.create({
      actorId: actor.id,
      action: 'admin.internal-user.create',
      entityType: 'user',
      entityId: created.id,
      afterData: {
        email: created.email,
        roles: created.userRoles.map((userRole) => userRole.role.name),
      },
    });

    return created;
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
