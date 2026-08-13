import { BadRequestException } from '@nestjs/common';
import {
  AssetStatus,
  ReportStatus,
  ReportTargetType,
  ReviewStatus,
  RoleName,
  UserStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { ReportsService } from './reports.service';

describe('ReportsService', () => {
  const moderator: AuthenticatedUser = {
    id: 'moderator-1',
    email: 'moderator@example.com',
    fullName: 'Moderator',
    roles: [RoleName.MODERATOR],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const prisma = {
    report: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    review: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const auditService = {
    create: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const trustScoreService = {
    recalculateUserTrustScore: jest.fn(),
  };

  let service: ReportsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReportsService(
      prisma as never,
      auditService as never,
      notificationsService as never,
      trustScoreService as never,
    );
  });

  it('hides a reported asset when resolving a valid listing report', async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: 'report-1',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.UNDER_REVIEW,
      targetType: ReportTargetType.ASSET,
      targetId: 'asset-1',
    });
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      status: AssetStatus.ACTIVE,
      title: 'Canon R6',
    });
    prisma.report.update.mockResolvedValue({
      id: 'report-1',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.RESOLVED,
      targetType: ReportTargetType.ASSET,
      targetId: 'asset-1',
      resolutionSummary: 'Listing vi phạm chính sách.\nModeration action: HIDE_ASSET -> asset-1',
    });

    const result = await service.updateStatus('report-1', moderator, {
      status: ReportStatus.RESOLVED,
      resolutionSummary: 'Listing vi phạm chính sách.',
      action: 'HIDE_ASSET',
      actionNote: 'Ẩn listing để chờ xác minh giấy tờ.',
    });

    expect(prisma.asset.update).toHaveBeenCalledWith({
      where: { id: 'asset-1' },
      data: { status: AssetStatus.SUSPENDED },
    });
    expect(notificationsService.createMany).toHaveBeenCalledWith(['owner-1'], {
      type: 'ASSET_MODERATED',
      title: 'Listing bị ẩn do report hợp lệ',
      content:
        'Tài sản "Canon R6" đã bị ẩn sau khi report được xác nhận. Ghi chú: Ẩn listing để chờ xác minh giấy tờ.',
      referenceType: 'asset',
      referenceId: 'asset-1',
    });
    expect(result.status).toBe(ReportStatus.RESOLVED);
    expect(result.resolutionSummary).toContain('Moderation action: HIDE_ASSET -> asset-1');
  });

  it('warns the reported user when resolving a user report', async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: 'report-2',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.OPEN,
      targetType: ReportTargetType.USER,
      targetId: 'user-2',
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      status: UserStatus.ACTIVE,
    });
    prisma.report.update.mockResolvedValue({
      id: 'report-2',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.RESOLVED,
      targetType: ReportTargetType.USER,
      targetId: 'user-2',
      resolutionSummary:
        'Đã cảnh báo user về hành vi quấy rối.\nModeration action: WARN_REPORTED_USER -> user-2',
    });

    await service.updateStatus('report-2', moderator, {
      status: ReportStatus.RESOLVED,
      resolutionSummary: 'Đã cảnh báo user về hành vi quấy rối.',
      action: 'WARN_REPORTED_USER',
    });

    expect(notificationsService.createMany).toHaveBeenCalledWith(['user-2'], {
      type: 'SYSTEM',
      title: 'Tài khoản nhận cảnh báo từ moderation',
      content: 'Tài khoản của bạn vừa nhận cảnh báo do report đã được xác nhận.',
      referenceType: 'report',
      referenceId: 'report-2',
    });
  });

  it('hides a reported review and recalculates trust score', async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: 'report-3',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.OPEN,
      targetType: ReportTargetType.REVIEW,
      targetId: 'review-1',
    });
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerId: 'reviewer-1',
      revieweeId: 'reviewee-1',
      status: ReviewStatus.PUBLISHED,
    });
    prisma.report.update.mockResolvedValue({
      id: 'report-3',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.RESOLVED,
      targetType: ReportTargetType.REVIEW,
      targetId: 'review-1',
      resolutionSummary: 'Ẩn review spam.\nModeration action: HIDE_REVIEW -> review-1',
    });

    await service.updateStatus('report-3', moderator, {
      status: ReportStatus.RESOLVED,
      resolutionSummary: 'Ẩn review spam.',
      action: 'HIDE_REVIEW',
    });

    expect(prisma.review.update).toHaveBeenCalledWith({
      where: { id: 'review-1' },
      data: { status: ReviewStatus.HIDDEN },
    });
    expect(trustScoreService.recalculateUserTrustScore).toHaveBeenCalledWith('reviewee-1');
  });

  it('rejects incompatible moderation action for a report target', async () => {
    prisma.report.findUnique.mockResolvedValue({
      id: 'report-4',
      reporterId: 'reporter-1',
      assignedToId: null,
      status: ReportStatus.OPEN,
      targetType: ReportTargetType.USER,
      targetId: 'user-3',
    });

    await expect(
      service.updateStatus('report-4', moderator, {
        status: ReportStatus.RESOLVED,
        resolutionSummary: 'Không thể giữ review này.',
        action: 'HIDE_REVIEW',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
