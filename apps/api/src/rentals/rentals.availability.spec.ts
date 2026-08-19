import { ConflictException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService availability enforcement', () => {
  const renterUser: AuthenticatedUser = {
    id: 'renter-1',
    email: 'renter@example.com',
    fullName: 'Renter User',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const asset = {
    id: 'asset-1',
    ownerId: 'owner-1',
    title: 'Canon R6',
    pricePerDay: 200000,
    minimumDurationDays: 1,
    maximumDurationDays: 10,
    status: AssetStatus.ACTIVE,
    estimatedValue: 40000000,
    owner: {
      id: 'owner-1',
      verification: {
        verificationStatus: 'VERIFIED',
      },
    },
  };

  const prisma = {
    asset: {
      findUnique: jest.fn(),
    },
    assetAvailability: {
      findFirst: jest.fn(),
      count: jest.fn(),
    },
    rentalRequest: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    $queryRaw: jest.fn(),
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
  };

  const trustScoreService = {
    recalculateUserTrustScore: jest.fn(),
  };

  let service: RentalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.asset.findUnique.mockResolvedValue(asset);
    prisma.rentalRequest.findFirst.mockResolvedValue(null);
    prisma.systemConfig.findUnique.mockResolvedValue(null);
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
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

  it('rejects rentals that overlap a blocked availability window', async () => {
    prisma.assetAvailability.findFirst.mockResolvedValueOnce({
      id: 'availability-1',
    });

    await expect(
      service.create(renterUser, {
        assetId: asset.id,
        startAt: '2026-08-20T02:00:00.000Z',
        endAt: '2026-08-22T02:00:00.000Z',
        deliveryMethod: 'pickup',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.rentalRequest.create).not.toHaveBeenCalled();
  });

  it('rejects rentals outside explicitly opened availability windows', async () => {
    prisma.assetAvailability.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.assetAvailability.count.mockResolvedValue(1);

    await expect(
      service.create(renterUser, {
        assetId: asset.id,
        startAt: '2026-08-20T02:00:00.000Z',
        endAt: '2026-08-22T02:00:00.000Z',
        deliveryMethod: 'pickup',
      }),
    ).rejects.toThrow('This asset is not open for the selected time range');

    expect(prisma.rentalRequest.create).not.toHaveBeenCalled();
  });
});
