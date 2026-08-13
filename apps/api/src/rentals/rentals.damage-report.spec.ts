import {
  DisputeStatus,
  EvidenceType,
  PayoutStatus,
  RentalStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService damage report', () => {
  const ownerUser: AuthenticatedUser = {
    id: 'owner-1',
    email: 'owner@example.com',
    fullName: 'Owner User',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const renterUser: AuthenticatedUser = {
    id: 'renter-1',
    email: 'renter@example.com',
    fullName: 'Renter User',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const rental = {
    id: 'rental-1',
    assetId: 'asset-1',
    ownerId: ownerUser.id,
    renterId: renterUser.id,
    currency: 'VND',
    asset: {
      id: 'asset-1',
      title: 'Canon R6',
      images: [],
    },
    owner: {
      id: ownerUser.id,
      fullName: ownerUser.fullName,
      email: ownerUser.email,
    },
    renter: {
      id: renterUser.id,
      fullName: renterUser.fullName,
      email: renterUser.email,
    },
    contract: null,
    payments: [],
    payout: {
      id: 'payout-1',
      status: PayoutStatus.PENDING,
    },
    handovers: [],
    reviews: [],
    status: RentalStatus.RETURN_PENDING,
  };

  const prisma = {
    asset: {
      findUnique: jest.fn(),
    },
    rentalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    handover: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    handoverQrSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payout: {
      update: jest.fn(),
      upsert: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    rentalContract: {
      upsert: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    contractSignature: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    dispute: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    refund: {
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    evidence: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const analyticsService = {
    track: jest.fn(),
  };

  const chatService = {
    appendSystemMessageForRental: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const riskService = {
    assessRentalCreation: jest.fn(),
    assessCancellationPattern: jest.fn(),
  };

  const trustScoreService = {
    recalculateUserTrustScore: jest.fn(),
  };

  let service: RentalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rentalRequest.findUnique.mockResolvedValue(rental);
    prisma.dispute.findFirst.mockResolvedValue(null);
    prisma.dispute.create.mockResolvedValue({
      id: 'dispute-1',
    });
    prisma.dispute.findUniqueOrThrow.mockResolvedValue({
      id: 'dispute-1',
      rentalId: rental.id,
      reason: 'RETURN_ISSUE',
    });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    service = new RentalsService(
      prisma as never,
      auditService as never,
      analyticsService as never,
      chatService as never,
      notificationsService as never,
      riskService as never,
      trustScoreService as never,
    );
  });

  it('uploads standalone rental evidence for later dispute usage', async () => {
    prisma.evidence.create.mockResolvedValue({
      id: 'evidence-1',
      rentalId: rental.id,
      uploadedBy: ownerUser.id,
      type: EvidenceType.PHOTO,
    });

    const result = await service.uploadEvidence(rental.id, ownerUser, {
      type: EvidenceType.PHOTO,
      fileUrl: 'https://cdn.example.com/damage-after.jpg',
      description: 'Ảnh sau khi nhận lại tài sản',
      tag: 'after-image',
    });

    expect(prisma.evidence.create).toHaveBeenCalledWith({
      data: {
        rentalId: rental.id,
        uploadedBy: ownerUser.id,
        type: EvidenceType.PHOTO,
        fileUrl: 'https://cdn.example.com/damage-after.jpg',
        fileKey: undefined,
        fileHash: undefined,
        metadata: {
          description: 'Ảnh sau khi nhận lại tài sản',
          tag: 'after-image',
          source: 'rentals.uploadEvidence',
        },
      },
    });
    expect(result.id).toBe('evidence-1');
  });

  it('opens a damage dispute with estimate and linked evidences', async () => {
    prisma.evidence.findMany.mockResolvedValue([
      {
        id: 'evidence-1',
        rentalId: rental.id,
        handoverId: null,
        uploadedBy: ownerUser.id,
      },
      {
        id: 'evidence-2',
        rentalId: rental.id,
        handoverId: 'handover-return-1',
        uploadedBy: renterUser.id,
      },
    ]);

    await service.reportIssue(rental.id, ownerUser, {
      description: 'Ống kính bị trầy ở viền trước.',
      repairEstimate: 850000,
      evidenceIds: ['evidence-1', 'evidence-2'],
      damageItems: ['front element', 'lens ring'],
    });

    expect(prisma.dispute.create).toHaveBeenCalledWith({
      data: {
        rentalId: rental.id,
        openedById: ownerUser.id,
        reason: 'RETURN_ISSUE',
        description:
          'Ống kính bị trầy ở viền trước. Hạng mục bị ảnh hưởng: front element, lens ring. Ước tính sửa chữa: 850000 VND.',
        status: DisputeStatus.WAITING_RESPONSE,
        events: {
          create: [
            {
              actorId: ownerUser.id,
              eventType: 'OPENED',
              content: 'Ống kính bị trầy ở viền trước.',
              metadata: {
                source: 'rentals.reportIssue',
                damageItems: ['front element', 'lens ring'],
                repairEstimate: 850000,
                repairCurrency: 'VND',
              },
            },
            {
              actorId: ownerUser.id,
              eventType: 'EVIDENCE_ATTACHED',
              content: 'Attached 2 damage evidence item(s)',
              metadata: undefined,
            },
            {
              actorId: ownerUser.id,
              eventType: 'NOTE',
              content: 'Repair estimate submitted: 850000 VND',
              metadata: undefined,
            },
          ],
        },
        evidences: {
          create: [
            {
              evidenceId: 'evidence-1',
              uploadedById: ownerUser.id,
            },
            {
              evidenceId: 'evidence-2',
              uploadedById: ownerUser.id,
            },
          ],
        },
      },
    });
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'rentals.reportIssue',
          repairEstimate: 850000,
          evidenceCount: 2,
        }),
      }),
    );
  });
});
