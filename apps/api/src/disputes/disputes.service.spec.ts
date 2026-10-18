import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import sharp from 'sharp';
import {
  DisputeStatus,
  PayoutStatus,
  RentalStatus,
  RoleName,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { DisputesService } from './disputes.service';

describe('DisputesService', () => {
  const renterUser: AuthenticatedUser = {
    id: 'renter-1',
    email: 'renter@example.com',
    fullName: 'Renter User',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const disputeOfficer: AuthenticatedUser = {
    id: 'staff-1',
    email: 'staff@example.com',
    fullName: 'Dispute Officer',
    roles: [RoleName.DISPUTE_OFFICER],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const dispute = {
    id: 'dispute-1',
    rentalId: 'rental-1',
    openedById: 'owner-1',
    assignedToId: null,
    reason: 'RETURN_ISSUE',
    status: DisputeStatus.WAITING_RESPONSE,
    resolutionSummary: null,
    rental: {
      id: 'rental-1',
      ownerId: 'owner-1',
      renterId: 'renter-1',
      asset: {
        title: 'Canon R6',
      },
      handovers: [
        {
          type: 'RETURN',
          status: 'CONFIRMED',
        },
      ],
      payout: {
        id: 'payout-1',
        status: PayoutStatus.BLOCKED,
      },
    },
  };

  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    dispute: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    disputeEvent: {
      create: jest.fn(),
    },
    disputeEvidence: {
      createMany: jest.fn(),
    },
    evidence: {
      findMany: jest.fn(),
    },
    payout: {
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const analyticsService = {
    track: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const trustScoreService = {
    recalculateUserTrustScore: jest.fn(),
  };

  const storageService = {
    readAssetImage: jest.fn(),
  };

  let service: DisputesService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.dispute.findUnique.mockResolvedValue(dispute);
    prisma.dispute.findUniqueOrThrow.mockResolvedValue({
      ...dispute,
      status: DisputeStatus.RESOLVED,
      resolutionSummary: 'Renter accepted the reported damage and repair estimate',
    });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    service = new DisputesService(
      prisma as never,
      auditService as never,
      analyticsService as never,
      notificationsService as never,
      trustScoreService as never,
      new ConfigService(),
      storageService as never,
    );
  });

  it('allows the renter to accept an owner damage report and restores payout flow', async () => {
    const result = await service.acceptDamageReport('dispute-1', renterUser, {});

    expect(prisma.disputeEvent.create).toHaveBeenCalledWith({
      data: {
        disputeId: 'dispute-1',
        actorId: renterUser.id,
        eventType: 'RESOLVED',
        content: 'Người thuê đã chấp nhận báo cáo hư hỏng.',
        metadata: {
          acceptedByRenter: true,
        },
      },
    });
    expect(prisma.rentalRequest.update).toHaveBeenCalledWith({
      where: { id: 'rental-1' },
      data: {
        status: RentalStatus.COMPLETED,
      },
    });
    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: {
        status: 'PENDING',
      },
    });
    expect(trustScoreService.recalculateUserTrustScore).toHaveBeenCalledWith('owner-1');
    expect(trustScoreService.recalculateUserTrustScore).toHaveBeenCalledWith('renter-1');
    expect(result.status).toBe(DisputeStatus.RESOLVED);
  });

  it('rejects accept-damage-report for non-renter users', async () => {
    await expect(
      service.acceptDamageReport(
        'dispute-1',
        {
          ...renterUser,
          id: 'stranger-1',
          email: 'stranger@example.com',
        },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('restores blocked payout when staff closes a return dispute after confirmed return', async () => {
    prisma.dispute.findUniqueOrThrow.mockResolvedValue({
      ...dispute,
      status: DisputeStatus.CLOSED,
      resolutionSummary: 'Issue resolved after manual review',
    });

    await service.updateStatus('dispute-1', disputeOfficer, {
      status: DisputeStatus.CLOSED,
      resolutionSummary: 'Issue resolved after manual review',
    });

    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: {
        status: 'PENDING',
      },
    });
    expect(trustScoreService.recalculateUserTrustScore).toHaveBeenCalledWith('owner-1');
    expect(trustScoreService.recalculateUserTrustScore).toHaveBeenCalledWith('renter-1');
  });

  it('rejects accepting a dispute that is not a damage report', async () => {
    prisma.dispute.findUnique.mockResolvedValue({
      ...dispute,
      reason: 'LOST_ASSET',
    });

    await expect(
      service.acceptDamageReport('dispute-1', renterUser, {}),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects reopening a terminal dispute', async () => {
    prisma.dispute.findUnique.mockResolvedValue({
      ...dispute,
      status: DisputeStatus.CLOSED,
    });

    await expect(
      service.updateStatus('dispute-1', disputeOfficer, {
        status: DisputeStatus.UNDER_REVIEW,
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('compares a listing photo with a linked dispute photo and saves AI advice', async () => {
    prisma.dispute.findUnique.mockResolvedValue({
      ...dispute,
      rental: {
        ...dispute.rental,
        asset: {
          ...dispute.rental.asset,
          images: [{ id: 'listing-photo', fileKey: 'assets/listing.webp' }],
        },
      },
      evidences: [{
        evidenceId: 'after-photo',
        evidence: { id: 'after-photo', fileKey: 'assets/after.webp', type: 'PHOTO' },
      }],
    });
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer();
    storageService.readAssetImage.mockResolvedValue(image);
    const analysis = {
      damaged: false,
      confidence: 0.6,
      severity: 'NONE',
      summary: 'Không đủ bằng chứng',
      findings: [],
      recommendedAction: 'Admin xem thêm ảnh',
      suggestedCompensation: 0,
      limitations: ['Ảnh bài đăng không phải ảnh lúc bàn giao'],
    };
    const analyze = jest.spyOn(service, 'analyzeDamageImages').mockResolvedValue(analysis as never);

    await service.analyzeForDispute('dispute-1', disputeOfficer, {
      assetImageId: 'listing-photo',
      evidenceId: 'after-photo',
    });

    expect(storageService.readAssetImage.mock.calls).toEqual([
      ['assets/listing.webp'],
      ['assets/after.webp'],
    ]);
    expect(analyze).toHaveBeenCalledWith(null, [
      expect.objectContaining({ originalname: 'listing-before.jpg', mimetype: 'image/jpeg' }),
      expect.objectContaining({ originalname: 'dispute-after.jpg', mimetype: 'image/jpeg' }),
    ]);
    expect(prisma.disputeEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        disputeId: 'dispute-1',
        metadata: expect.objectContaining({
          kind: 'AI_DAMAGE_ANALYSIS',
          assetImageId: 'listing-photo',
          evidenceId: 'after-photo',
          result: analysis,
        }),
      }),
    });
  });

  it('automatically analyzes the cover photo against the newest dispute photo once', async () => {
    const image = await sharp({ create: { width: 2, height: 2, channels: 3, background: '#ffffff' } })
      .png()
      .toBuffer();
    const linkedDispute = {
      ...dispute,
      rental: {
        ...dispute.rental,
        asset: { ...dispute.rental.asset, images: [
          { id: 'listing-photo', fileKey: 'assets/listing.webp', isCover: true },
        ] },
      },
      evidences: [{
        evidenceId: 'after-photo',
        createdAt: new Date(),
        evidence: { id: 'after-photo', fileKey: 'assets/after.webp', type: 'PHOTO' },
      }],
      events: [],
    };
    prisma.dispute.findMany.mockResolvedValue([linkedDispute]);
    prisma.dispute.findUnique.mockResolvedValue(linkedDispute);
    storageService.readAssetImage.mockResolvedValue(image);
    jest.spyOn(service, 'analyzeDamageImages').mockResolvedValue({ summary: 'Review' } as never);

    await (service as any).processAutomaticAnalyses();

    expect(prisma.disputeEvent.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: null,
        metadata: expect.objectContaining({
          kind: 'AI_DAMAGE_ANALYSIS',
          assetImageId: 'listing-photo',
          evidenceId: 'after-photo',
        }),
      }),
    });

    linkedDispute.events.push({
      metadata: { kind: 'AI_DAMAGE_ANALYSIS', assetImageId: 'listing-photo', evidenceId: 'after-photo' },
    } as never);
    await (service as any).processAutomaticAnalyses();
    expect(prisma.disputeEvent.create).toHaveBeenCalledTimes(1);
  });

  it('does not analyze a photo that is not linked to this dispute', async () => {
    prisma.dispute.findUnique.mockResolvedValue({
      ...dispute,
      rental: {
        ...dispute.rental,
        asset: {
          ...dispute.rental.asset,
          images: [{ id: 'listing-photo', fileKey: 'assets/listing.webp' }],
        },
      },
      evidences: [],
    });

    await expect(service.analyzeForDispute('dispute-1', disputeOfficer, {
      assetImageId: 'listing-photo',
      evidenceId: 'another-rental-photo',
    })).rejects.toBeInstanceOf(BadRequestException);

    expect(storageService.readAssetImage).not.toHaveBeenCalled();
  });
});
