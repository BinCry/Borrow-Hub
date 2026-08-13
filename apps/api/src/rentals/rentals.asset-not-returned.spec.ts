import { ConflictException } from '@nestjs/common';
import { DisputeStatus, PayoutStatus, RentalStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService asset not returned', () => {
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
    ownerId: ownerUser.id,
    renterId: renterUser.id,
    asset: {
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
    status: RentalStatus.OVERDUE,
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
      reason: 'LOST_ASSET',
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

  it('opens a dispute and blocks payout when the owner marks asset not returned', async () => {
    await service.markAssetNotReturned(rental.id, ownerUser, {
      description: 'Renter has not returned the camera after the agreed time.',
    });

    expect(prisma.rentalRequest.update).toHaveBeenCalledWith({
      where: { id: rental.id },
      data: {
        status: RentalStatus.DISPUTED,
        message: 'Renter has not returned the camera after the agreed time.',
      },
    });
    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: {
        status: PayoutStatus.BLOCKED,
      },
    });
    expect(prisma.dispute.create).toHaveBeenCalledWith({
      data: {
        rentalId: rental.id,
        openedById: ownerUser.id,
        reason: 'LOST_ASSET',
        description: 'Renter has not returned the camera after the agreed time.',
        status: DisputeStatus.OPEN,
        events: {
          create: [
            {
              actorId: ownerUser.id,
              eventType: 'OPENED',
              content: 'Renter has not returned the camera after the agreed time.',
              metadata: {
                source: 'rentals.markAssetNotReturned',
              },
            },
          ],
        },
        evidences: undefined,
      },
    });
    expect(notificationsService.createMany).toHaveBeenCalledWith([renterUser.id], {
      type: 'SYSTEM',
      title: 'Chủ tài sản báo chưa nhận lại tài sản',
      content:
        'Chủ tài sản đã đánh dấu "Canon R6" là chưa được hoàn trả và mở dispute xử lý.',
      referenceType: 'dispute',
      referenceId: 'dispute-1',
    });
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          source: 'rentals.markAssetNotReturned',
        }),
      }),
    );
  });

  it('rejects duplicate active disputes for the same rental', async () => {
    prisma.dispute.findFirst.mockResolvedValue({
      id: 'dispute-existing',
    });

    await expect(
      service.markAssetNotReturned(rental.id, ownerUser, {}),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
