import { AssetStatus, RoleName } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { AssetsService } from './assets.service';

describe('AssetsService', () => {
  const moderatorUser: AuthenticatedUser = {
    id: 'moderator-1',
    email: 'moderator@example.com',
    fullName: 'Moderator User',
    roles: [RoleName.MODERATOR],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const prisma = {
    asset: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const analyticsService = {
    track: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const riskService = {
    assessAssetSubmission: jest.fn(),
  };

  let service: AssetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.asset.findUnique.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      title: 'Canon R6',
      status: AssetStatus.PENDING_REVIEW,
    });
    prisma.asset.update.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      title: 'Canon R6',
      status: AssetStatus.REJECTED,
    });

    service = new AssetsService(
      prisma as never,
      analyticsService as never,
      auditService as never,
      notificationsService as never,
      riskService as never,
    );
  });

  it('sends moderation reason to the owner when rejecting a listing', async () => {
    await service.moderate('asset-1', moderatorUser, {
      status: AssetStatus.REJECTED,
      reason: 'Thiếu ảnh chứng minh serial và mô tả chưa đủ rõ.',
    });

    expect(notificationsService.createMany).toHaveBeenCalledWith(['owner-1'], {
      type: 'ASSET_MODERATED',
      title: 'Listing bị từ chối',
      content:
        'Tài sản "Canon R6" đã được cập nhật sang trạng thái REJECTED. Lý do: Thiếu ảnh chứng minh serial và mô tả chưa đủ rõ.',
      referenceType: 'asset',
      referenceId: 'asset-1',
    });
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        afterData: {
          status: AssetStatus.REJECTED,
          moderationReason: 'Thiếu ảnh chứng minh serial và mô tả chưa đủ rõ.',
        },
      }),
    );
  });

  it('uses an approval-focused title when a listing becomes active', async () => {
    prisma.asset.update.mockResolvedValue({
      id: 'asset-1',
      ownerId: 'owner-1',
      title: 'Canon R6',
      status: AssetStatus.ACTIVE,
    });

    await service.moderate('asset-1', moderatorUser, {
      status: AssetStatus.ACTIVE,
    });

    expect(notificationsService.createMany).toHaveBeenCalledWith(['owner-1'], {
      type: 'ASSET_MODERATED',
      title: 'Listing đã được duyệt',
      content: 'Tài sản "Canon R6" đã được cập nhật sang trạng thái ACTIVE.',
      referenceType: 'asset',
      referenceId: 'asset-1',
    });
  });
});
