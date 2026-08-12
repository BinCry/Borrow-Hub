import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  ReportStatus,
  ReportTargetType,
  RoleName,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignReportDto,
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './reports.dto';

const TERMINAL_REPORT_STATUSES: ReportStatus[] = [
  ReportStatus.RESOLVED,
  ReportStatus.REJECTED,
  ReportStatus.CLOSED,
];

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(currentUser: AuthenticatedUser, dto: CreateReportDto) {
    await this.ensureTargetExists(dto.targetType, dto.targetId);

    const report = await this.prisma.report.create({
      data: {
        reporterId: currentUser.id,
        targetType: dto.targetType,
        targetId: dto.targetId,
        reason: dto.reason,
        description: dto.description,
      },
      include: this.reportInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.create',
      entityType: 'report',
      entityId: report.id,
      afterData: {
        targetType: report.targetType,
        targetId: report.targetId,
        reason: report.reason,
      },
    });

    return report;
  }

  listMine(currentUser: AuthenticatedUser, query: ReportQueryDto) {
    const where: Prisma.ReportWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...this.buildScopeFilter(currentUser, query.role),
    };

    return this.prisma.report.findMany({
      where,
      include: this.reportInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getById(reportId: string, currentUser: AuthenticatedUser) {
    return this.findAccessibleReport(reportId, currentUser);
  }

  async assign(
    reportId: string,
    currentUser: AuthenticatedUser,
    dto: AssignReportDto,
  ) {
    this.assertReportManager(currentUser);
    const report = await this.findAccessibleReport(reportId, currentUser);

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
        include: {
          userRoles: {
            include: {
              role: true,
            },
          },
        },
      });

      if (!assignee) {
        throw new NotFoundException('Assignee not found');
      }

      const assigneeRoles = assignee.userRoles.map((userRole) => userRole.role.name);
      if (!assigneeRoles.some((role) => this.reportManagerRoles().includes(role))) {
        throw new BadRequestException('Assignee must be a staff account');
      }
    }

    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: {
        assignedToId: dto.assignedToId ?? null,
        status:
          report.status === ReportStatus.OPEN
            ? ReportStatus.UNDER_REVIEW
            : report.status,
      },
      include: this.reportInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.assign',
      entityType: 'report',
      entityId: updated.id,
      beforeData: { assignedToId: report.assignedToId },
      afterData: { assignedToId: updated.assignedToId, status: updated.status },
    });

    await this.notificationsService.createMany(
      [report.reporterId, updated.assignedToId].filter(
        (userId): userId is string => Boolean(userId && userId !== currentUser.id),
      ),
      {
        type: NotificationType.SYSTEM,
        title: 'Report đã được phân công',
        content: `Report ${updated.id} đã được cập nhật người phụ trách.`,
        referenceType: 'report',
        referenceId: updated.id,
      },
    );

    return updated;
  }

  async updateStatus(
    reportId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateReportStatusDto,
  ) {
    this.assertReportManager(currentUser);
    const report = await this.findAccessibleReport(reportId, currentUser);

    if (
      TERMINAL_REPORT_STATUSES.includes(dto.status) &&
      !dto.resolutionSummary
    ) {
      throw new BadRequestException(
        'resolutionSummary is required for terminal report statuses',
      );
    }

    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: {
        status: dto.status,
        resolutionSummary: dto.resolutionSummary ?? report.resolutionSummary,
        resolvedAt: TERMINAL_REPORT_STATUSES.includes(dto.status)
          ? new Date()
          : null,
      },
      include: this.reportInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.status.update',
      entityType: 'report',
      entityId: updated.id,
      beforeData: { status: report.status },
      afterData: {
        status: updated.status,
        resolutionSummary: updated.resolutionSummary,
      },
    });

    await this.notificationsService.createMany(
      [report.reporterId].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Report đã đổi trạng thái',
        content: `Report ${updated.id} đã chuyển sang ${updated.status}.`,
        referenceType: 'report',
        referenceId: updated.id,
      },
    );

    return updated;
  }

  private async ensureTargetExists(targetType: ReportTargetType, targetId: string) {
    switch (targetType) {
      case ReportTargetType.USER: {
        const user = await this.prisma.user.findUnique({ where: { id: targetId } });
        if (!user) {
          throw new NotFoundException('Target user not found');
        }
        return;
      }
      case ReportTargetType.ASSET: {
        const asset = await this.prisma.asset.findUnique({ where: { id: targetId } });
        if (!asset) {
          throw new NotFoundException('Target asset not found');
        }
        return;
      }
      case ReportTargetType.REVIEW: {
        const review = await this.prisma.review.findUnique({ where: { id: targetId } });
        if (!review) {
          throw new NotFoundException('Target review not found');
        }
        return;
      }
      case ReportTargetType.CHAT_MESSAGE: {
        const message = await this.prisma.message.findUnique({ where: { id: targetId } });
        if (!message) {
          throw new NotFoundException('Target chat message not found');
        }
      }
    }
  }

  private async findAccessibleReport(
    reportId: string,
    currentUser: AuthenticatedUser,
  ) {
    const report = await this.prisma.report.findUnique({
      where: { id: reportId },
      include: this.reportInclude(),
    });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    const canAccess =
      report.reporterId === currentUser.id ||
      report.assignedToId === currentUser.id ||
      this.isStaff(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this report');
    }

    return report;
  }

  private buildScopeFilter(
    currentUser: AuthenticatedUser,
    role: ReportQueryDto['role'],
  ): Prisma.ReportWhereInput {
    if (role === 'reported') {
      return { reporterId: currentUser.id };
    }

    if (role === 'assigned') {
      if (!this.isStaff(currentUser)) {
        return { id: '__no_results__' };
      }

      return { assignedToId: currentUser.id };
    }

    if (role === 'all' && this.isStaff(currentUser)) {
      return {};
    }

    return {
      OR: [
        { reporterId: currentUser.id },
        ...(this.isStaff(currentUser) ? [{ assignedToId: currentUser.id }] : []),
      ],
    };
  }

  private reportInclude() {
    return {
      reporter: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    } satisfies Prisma.ReportInclude;
  }

  private assertReportManager(currentUser: AuthenticatedUser) {
    if (!currentUser.roles.some((role) => this.reportManagerRoles().includes(role))) {
      throw new ForbiddenException('Only staff can manage reports');
    }
  }

  private reportManagerRoles(): RoleName[] {
    return [
      RoleName.MODERATOR,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];
  }

  private isStaff(currentUser: AuthenticatedUser) {
    return currentUser.roles.some((role) => this.reportManagerRoles().includes(role));
  }
}
