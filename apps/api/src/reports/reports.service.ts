import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  NotificationType,
  Prisma,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  RoleName,
  UserStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignReportDto,
  CreateReportDto,
  type ReportModerationAction,
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

    if (dto.action && dto.action !== 'NONE' && dto.status !== ReportStatus.RESOLVED) {
      throw new BadRequestException(
        'Moderation action can only be applied when resolving a report',
      );
    }

    const moderationSummary =
      dto.action && dto.action !== 'NONE'
        ? await this.applyModerationAction(
            report,
            currentUser,
            dto.action,
            dto.actionNote,
          )
        : null;

    const updated = await this.prisma.report.update({
      where: { id: report.id },
      data: {
        status: dto.status,
        resolutionSummary: this.mergeResolutionSummary(
          dto.resolutionSummary ?? report.resolutionSummary,
          moderationSummary,
        ),
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
        moderationAction: dto.action ?? 'NONE',
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

  private mergeResolutionSummary(
    resolutionSummary: string | null | undefined,
    moderationSummary: string | null,
  ) {
    if (!moderationSummary) {
      return resolutionSummary ?? null;
    }

    if (!resolutionSummary?.trim()) {
      return moderationSummary;
    }

    return `${resolutionSummary.trim()}\nModeration action: ${moderationSummary}`;
  }

  private async applyModerationAction(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    action: ReportModerationAction,
    actionNote?: string,
  ) {
    const trimmedActionNote = actionNote?.trim() || null;

    switch (action) {
      case 'WARN_REPORTED_USER':
        return this.warnReportedUser(report, currentUser, trimmedActionNote);
      case 'SUSPEND_REPORTED_USER':
        return this.suspendReportedUser(report, currentUser, trimmedActionNote);
      case 'HIDE_ASSET':
        return this.hideReportedAsset(report, currentUser, trimmedActionNote);
      case 'HIDE_REVIEW':
        return this.hideReportedReview(report, currentUser, trimmedActionNote);
      case 'HIDE_CHAT_MESSAGE':
        return this.hideReportedChatMessage(report, currentUser, trimmedActionNote);
      default:
        return null;
    }
  }

  private async warnReportedUser(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    actionNote: string | null,
  ) {
    const targetUser = await this.resolveReportedUser(report);

    await this.notificationsService.createMany(
      [targetUser.id].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tài khoản nhận cảnh báo từ moderation',
        content: actionNote
          ? `Tài khoản của bạn vừa nhận cảnh báo do report đã được xác nhận. Ghi chú: ${actionNote}`
          : 'Tài khoản của bạn vừa nhận cảnh báo do report đã được xác nhận.',
        referenceType: 'report',
        referenceId: report.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.target.user.warn',
      entityType: 'user',
      entityId: targetUser.id,
      afterData: {
        reportId: report.id,
        actionNote,
      },
    });

    return `WARN_REPORTED_USER -> ${targetUser.id}`;
  }

  private async suspendReportedUser(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    actionNote: string | null,
  ) {
    const targetUser = await this.resolveReportedUser(report);
    const nextStatus =
      targetUser.status === UserStatus.BANNED || targetUser.status === UserStatus.DELETED
        ? targetUser.status
        : UserStatus.SUSPENDED;

    if (nextStatus !== targetUser.status) {
      await this.prisma.user.update({
        where: { id: targetUser.id },
        data: { status: nextStatus },
      });
    }

    await this.notificationsService.createMany(
      [targetUser.id].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tài khoản đã bị tạm ngưng',
        content: actionNote
          ? `Tài khoản của bạn đã bị tạm ngưng sau khi report được xác nhận. Ghi chú: ${actionNote}`
          : 'Tài khoản của bạn đã bị tạm ngưng sau khi report được xác nhận.',
        referenceType: 'report',
        referenceId: report.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.target.user.suspend',
      entityType: 'user',
      entityId: targetUser.id,
      beforeData: {
        status: targetUser.status,
      },
      afterData: {
        status: nextStatus,
        reportId: report.id,
        actionNote,
      },
    });

    return `SUSPEND_REPORTED_USER -> ${targetUser.id}`;
  }

  private async hideReportedAsset(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    actionNote: string | null,
  ) {
    if (report.targetType !== ReportTargetType.ASSET) {
      throw new BadRequestException('HIDE_ASSET only supports asset reports');
    }

    const asset = await this.prisma.asset.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        ownerId: true,
        status: true,
        title: true,
      },
    });

    if (!asset) {
      throw new NotFoundException('Target asset not found');
    }

    if (asset.status !== AssetStatus.SUSPENDED) {
      await this.prisma.asset.update({
        where: { id: asset.id },
        data: { status: AssetStatus.SUSPENDED },
      });
    }

    await this.notificationsService.createMany(
      [asset.ownerId].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.ASSET_MODERATED,
        title: 'Listing bị ẩn do report hợp lệ',
        content: actionNote
          ? `Tài sản "${asset.title}" đã bị ẩn sau khi report được xác nhận. Ghi chú: ${actionNote}`
          : `Tài sản "${asset.title}" đã bị ẩn sau khi report được xác nhận.`,
        referenceType: 'asset',
        referenceId: asset.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.target.asset.hide',
      entityType: 'asset',
      entityId: asset.id,
      beforeData: {
        status: asset.status,
      },
      afterData: {
        status: AssetStatus.SUSPENDED,
        reportId: report.id,
        actionNote,
      },
    });

    return `HIDE_ASSET -> ${asset.id}`;
  }

  private async hideReportedReview(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    actionNote: string | null,
  ) {
    if (report.targetType !== ReportTargetType.REVIEW) {
      throw new BadRequestException('HIDE_REVIEW only supports review reports');
    }

    const review = await this.prisma.review.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        reviewerId: true,
        revieweeId: true,
        status: true,
      },
    });

    if (!review) {
      throw new NotFoundException('Target review not found');
    }

    if (review.status !== ReviewStatus.HIDDEN) {
      await this.prisma.review.update({
        where: { id: review.id },
        data: { status: ReviewStatus.HIDDEN },
      });
      await this.recalculateTrustScore(review.revieweeId);
    }

    await this.notificationsService.createMany(
      [review.reviewerId].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Review đã bị ẩn',
        content: actionNote
          ? `Review của bạn đã bị ẩn sau khi report được xác nhận. Ghi chú: ${actionNote}`
          : 'Review của bạn đã bị ẩn sau khi report được xác nhận.',
        referenceType: 'report',
        referenceId: report.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.target.review.hide',
      entityType: 'review',
      entityId: review.id,
      beforeData: {
        status: review.status,
      },
      afterData: {
        status: ReviewStatus.HIDDEN,
        reportId: report.id,
        actionNote,
      },
    });

    return `HIDE_REVIEW -> ${review.id}`;
  }

  private async hideReportedChatMessage(
    report: {
      id: string;
      targetType: ReportTargetType;
      targetId: string;
    },
    currentUser: AuthenticatedUser,
    actionNote: string | null,
  ) {
    if (report.targetType !== ReportTargetType.CHAT_MESSAGE) {
      throw new BadRequestException(
        'HIDE_CHAT_MESSAGE only supports chat message reports',
      );
    }

    const message = await this.prisma.message.findUnique({
      where: { id: report.targetId },
      select: {
        id: true,
        senderId: true,
        content: true,
        attachmentUrl: true,
        metadata: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Target chat message not found');
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: {
        content: 'Nội dung đã bị ẩn bởi moderator do vi phạm chính sách.',
        attachmentUrl: null,
        metadata: {
          ...(this.asJsonObject(message.metadata) ?? {}),
          moderation: {
            hiddenByReportId: report.id,
            hiddenByUserId: currentUser.id,
            hiddenAt: new Date().toISOString(),
            note: actionNote,
          },
        } as Prisma.InputJsonValue,
      },
    });

    await this.notificationsService.createMany(
      [message.senderId].filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tin nhắn đã bị ẩn',
        content: actionNote
          ? `Một tin nhắn của bạn đã bị ẩn sau khi report được xác nhận. Ghi chú: ${actionNote}`
          : 'Một tin nhắn của bạn đã bị ẩn sau khi report được xác nhận.',
        referenceType: 'report',
        referenceId: report.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'report.target.chat-message.hide',
      entityType: 'message',
      entityId: message.id,
      beforeData: {
        content: message.content,
        hadAttachment: Boolean(message.attachmentUrl),
      },
      afterData: {
        content: 'Nội dung đã bị ẩn bởi moderator do vi phạm chính sách.',
        hadAttachment: false,
        reportId: report.id,
        actionNote,
      },
    });

    return `HIDE_CHAT_MESSAGE -> ${message.id}`;
  }

  private async resolveReportedUser(report: {
    targetType: ReportTargetType;
    targetId: string;
  }) {
    switch (report.targetType) {
      case ReportTargetType.USER: {
        const user = await this.prisma.user.findUnique({
          where: { id: report.targetId },
          select: {
            id: true,
            status: true,
          },
        });

        if (!user) {
          throw new NotFoundException('Target user not found');
        }

        return user;
      }
      case ReportTargetType.ASSET: {
        const asset = await this.prisma.asset.findUnique({
          where: { id: report.targetId },
          select: {
            owner: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        if (!asset?.owner) {
          throw new NotFoundException('Target asset owner not found');
        }

        return asset.owner;
      }
      case ReportTargetType.REVIEW: {
        const review = await this.prisma.review.findUnique({
          where: { id: report.targetId },
          select: {
            reviewer: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        if (!review?.reviewer) {
          throw new NotFoundException('Target review author not found');
        }

        return review.reviewer;
      }
      case ReportTargetType.CHAT_MESSAGE: {
        const message = await this.prisma.message.findUnique({
          where: { id: report.targetId },
          select: {
            sender: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        });

        if (!message?.sender) {
          throw new NotFoundException('Target message sender not found');
        }

        return message.sender;
      }
    }
  }

  private async recalculateTrustScore(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        status: ReviewStatus.PUBLISHED,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return;
    }

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const trustScore = Math.min(100, Math.round(averageRating * 20));

    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore },
    });
  }

  private asJsonObject(value: Prisma.JsonValue | null) {
    if (!value || Array.isArray(value) || typeof value !== 'object') {
      return null;
    }

    return value as Record<string, Prisma.JsonValue>;
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
