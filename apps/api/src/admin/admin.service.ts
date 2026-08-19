import {
  BadRequestException,
  Inject,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import * as argon2 from 'argon2';
import {
  DisputeStatus,
  PayoutStatus,
  Prisma,
  RefundStatus,
  ReportStatus,
  ReviewStatus,
  RiskIncidentStatus,
  RiskTargetType,
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RequestLogsService } from '../request-logs/request-logs.service';
import { CACHE_KEYS, CACHE_TTL_MS } from '../cache/cache.constants';
import {
  CreateInternalUserDto,
  UpdateSystemConfigDto,
  UpdateUserRolesDto,
  UpdateUserStatusDto,
} from './admin.dto';
import { RequestLogQueryDto } from '../request-logs/request-logs.dto';
import type { Cache } from 'cache-manager';

const adminUserSelect = {
  id: true,
  email: true,
  phone: true,
  fullName: true,
  avatarUrl: true,
  dateOfBirth: true,
  emailVerifiedAt: true,
  phoneVerifiedAt: true,
  status: true,
  trustScore: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
  verification: true,
  userRoles: {
    include: {
      role: true,
    },
  },
} satisfies Prisma.UserSelect;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly requestLogsService: RequestLogsService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async getDashboard() {
    return this.remember(
      CACHE_KEYS.adminDashboard,
      CACHE_TTL_MS.adminDashboard,
      async () => {
    const openDisputeStatuses = [
      DisputeStatus.OPEN,
      DisputeStatus.WAITING_RESPONSE,
      DisputeStatus.UNDER_REVIEW,
    ];
    const openReportStatuses = [ReportStatus.OPEN, ReportStatus.UNDER_REVIEW];
    const openRiskIncidentStatuses = [
      RiskIncidentStatus.OPEN,
      RiskIncidentStatus.UNDER_REVIEW,
    ];
    const fraudReasonFilters = [
      { reason: { contains: 'scam', mode: 'insensitive' as const } },
      { reason: { contains: 'fraud', mode: 'insensitive' as const } },
      { reason: { contains: 'fake', mode: 'insensitive' as const } },
      { reason: { contains: 'prohibited', mode: 'insensitive' as const } },
    ];

    const [
      totalUsers,
      verifiedUsers,
      suspendedUsers,
      bannedUsers,
      activeListings,
      totalRentals,
      completedRentals,
      cancelledRentals,
      overdueRentals,
      openDisputes,
      totalDisputes,
      totalDamageReports,
      totalGMV,
      totalPlatformRevenue,
      totalRefunds,
      refundCount,
      totalPayouts,
      blockedPayoutCount,
      openReports,
      fraudReports,
      openRiskIncidents,
      suspiciousAccounts,
      averageRating,
      fakeListingReports,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.userVerification.count({
        where: { verificationStatus: 'VERIFIED' },
      }),
      this.prisma.user.count({
        where: { status: 'SUSPENDED' },
      }),
      this.prisma.user.count({
        where: { status: 'BANNED' },
      }),
      this.prisma.asset.count({
        where: { status: 'ACTIVE' },
      }),
      this.prisma.rentalRequest.count(),
      this.prisma.rentalRequest.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.rentalRequest.count({
        where: { status: 'CANCELLED' },
      }),
      this.prisma.rentalRequest.count({
        where: { status: 'OVERDUE' },
      }),
      this.prisma.dispute.count({
        where: {
          status: {
            in: openDisputeStatuses,
          },
        },
      }),
      this.prisma.dispute.count(),
      this.prisma.dispute.count({
        where: {
          reason: 'RETURN_ISSUE',
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
      this.prisma.rentalRequest.aggregate({
        _sum: {
          serviceFee: true,
        },
        where: {
          payments: {
            some: {
              status: 'SUCCESS',
            },
          },
        },
      }),
      this.prisma.refund.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: RefundStatus.COMPLETED,
        },
      }),
      this.prisma.refund.count({
        where: {
          status: RefundStatus.COMPLETED,
        },
      }),
      this.prisma.payout.aggregate({
        _sum: {
          netAmount: true,
        },
        where: {
          status: PayoutStatus.PAID,
        },
      }),
      this.prisma.payout.count({
        where: {
          status: PayoutStatus.BLOCKED,
        },
      }),
      this.prisma.report.count({
        where: {
          status: {
            in: openReportStatuses,
          },
        },
      }),
      this.prisma.report.count({
        where: {
          status: {
            in: openReportStatuses,
          },
          OR: fraudReasonFilters,
        },
      }),
      this.prisma.riskIncident.count({
        where: {
          status: {
            in: openRiskIncidentStatuses,
          },
        },
      }),
      this.prisma.riskIncident.findMany({
        where: {
          status: {
            in: openRiskIncidentStatuses,
          },
          targetType: RiskTargetType.USER,
        },
        distinct: ['targetId'],
        select: {
          targetId: true,
        },
      }),
      this.prisma.review.aggregate({
        _avg: {
          rating: true,
        },
        where: {
          status: ReviewStatus.PUBLISHED,
        },
      }),
      this.prisma.report.count({
        where: {
          targetType: 'ASSET',
          OR: [
            { reason: { contains: 'fake', mode: 'insensitive' } },
            { reason: { contains: 'prohibited', mode: 'insensitive' } },
          ],
        },
      }),
    ]);

    const disputeRate = this.safeDivide(totalDisputes, totalRentals);
    const damageReportRate = this.safeDivide(totalDamageReports, totalRentals);
    const lateReturnRate = this.safeDivide(overdueRentals, totalRentals);
    const fakeListingRate = this.safeDivide(fakeListingReports, activeListings);
    const kycCompletionRate = this.safeDivide(verifiedUsers, totalUsers);
    const takeRate = this.safeDivide(
      totalPlatformRevenue._sum.serviceFee ?? 0,
      totalGMV._sum.amount ?? 0,
    );
    const cancellationRate = this.safeDivide(cancelledRentals, totalRentals);
    const completionRate = this.safeDivide(completedRentals, totalRentals);

    return {
      users: {
        total: totalUsers,
        verified: verifiedUsers,
        suspended: suspendedUsers,
        banned: bannedUsers,
        kycCompletionRate,
      },
      marketplace: {
        activeListings,
        totalRentals,
        completedRentals,
        cancelledRentals,
        overdueRentals,
        completionRate,
        cancellationRate,
        openIssues: openDisputes,
      },
      finance: {
        gmv: totalGMV._sum.amount ?? 0,
        platformRevenue: totalPlatformRevenue._sum.serviceFee ?? 0,
        takeRate,
        refundAmount: totalRefunds._sum.amount ?? 0,
        refundCount,
        paidOut: totalPayouts._sum.netAmount ?? 0,
        blockedPayoutCount,
      },
      risk: {
        openDisputes,
        openReports,
        fraudReports,
        openRiskIncidents,
        suspiciousAccounts: suspiciousAccounts.length,
      },
      trust: {
        disputeRate,
        damageReportRate,
        lateReturnRate,
        fakeListingRate,
        averageRating: averageRating._avg.rating ?? 0,
        kycCompletionRate,
      },
    };
      },
    );
  }

  private safeDivide(numerator: number, denominator: number) {
    if (denominator <= 0) {
      return 0;
    }

    return Number((numerator / denominator).toFixed(4));
  }

  listUsers() {
    return this.remember(CACHE_KEYS.adminUsers, CACHE_TTL_MS.adminUsers, () =>
      this.prisma.user.findMany({
        select: adminUserSelect,
        orderBy: [{ createdAt: 'desc' }],
      }),
    );
  }

  listRoles() {
    return this.remember(CACHE_KEYS.adminRoles, CACHE_TTL_MS.adminRoles, () =>
      this.prisma.role.findMany({
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
        orderBy: [{ name: 'asc' }],
      }),
    );
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
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!existing) {
      throw new NotFoundException('User not found');
    }

    const targetIsSuperAdmin = existing.userRoles.some(
      (userRole) => userRole.role.name === RoleName.SUPER_ADMIN,
    );
    const actorIsSuperAdmin = actor.roles.includes(RoleName.SUPER_ADMIN);

    if (targetIsSuperAdmin && !actorIsSuperAdmin) {
      throw new ForbiddenException(
        'Only a super admin can change a super admin account status',
      );
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { status: dto.status },
      select: adminUserSelect,
    });

    await this.auditService.create({
      actorId: actor.id,
      action: 'admin.user-status.update',
      entityType: 'user',
      entityId: userId,
      beforeData: { status: existing.status },
      afterData: { status: updated.status },
    });

    await this.invalidateAdminReadCache();

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
        select: adminUserSelect,
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

    await this.invalidateAdminReadCache();

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
      select: adminUserSelect,
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

    await this.invalidateAdminReadCache();

    return created;
  }

  listSystemConfigs() {
    return this.remember(
      CACHE_KEYS.adminSystemConfigs,
      CACHE_TTL_MS.adminSystemConfigs,
      () =>
        this.prisma.systemConfig.findMany({
          orderBy: [{ key: 'asc' }],
        }),
    );
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

    await this.invalidateAdminReadCache();

    return updated;
  }

  getAuditLogs() {
    return this.remember(CACHE_KEYS.adminAuditLogs, CACHE_TTL_MS.adminAuditLogs, () =>
      this.prisma.auditLog.findMany({
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
      }),
    );
  }

  getRequestLogs(query: RequestLogQueryDto) {
    const queryKey = JSON.stringify({
      requestId: query.requestId ?? null,
      userId: query.userId ?? null,
      method: query.method ?? null,
      statusCode: query.statusCode ?? null,
      endpointContains: query.endpointContains ?? null,
      limit: query.limit ?? null,
    });

    return this.remember(
      CACHE_KEYS.adminRequestLogs(queryKey),
      CACHE_TTL_MS.adminRequestLogs,
      () => this.requestLogsService.list(query),
    );
  }

  private async remember<T>(key: string, ttl: number, resolver: () => Promise<T>) {
    const cached = await this.cacheManager.get<T>(key);

    if (cached !== undefined) {
      return cached;
    }

    const value = await resolver();
    await this.cacheManager.set(key, value, ttl);
    return value;
  }

  private async invalidateAdminReadCache() {
    await Promise.all([
      this.cacheManager.del(CACHE_KEYS.adminDashboard),
      this.cacheManager.del(CACHE_KEYS.adminUsers),
      this.cacheManager.del(CACHE_KEYS.adminRoles),
      this.cacheManager.del(CACHE_KEYS.adminSystemConfigs),
      this.cacheManager.del(CACHE_KEYS.adminAuditLogs),
      this.cacheManager.clear(),
    ]);
  }
}
