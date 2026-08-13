import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  HandoverStatus,
  HandoverType,
  NotificationType,
  RentalStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService QR handover', () => {
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
    payout: null,
    handovers: [],
    reviews: [],
    status: RentalStatus.READY_FOR_HANDOVER,
  };

  const handover = {
    id: 'handover-1',
    rentalId: rental.id,
    type: HandoverType.DELIVERY,
    status: HandoverStatus.PENDING,
    notes: null,
  };

  const prisma = {
    asset: {
      findUnique: jest.fn(),
    },
    rentalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    handover: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    evidence: {
      createMany: jest.fn(),
    },
    handoverQrSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payout: {
      update: jest.fn(),
    },
    systemConfig: {
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
    prisma.handover.findUnique.mockResolvedValue(handover);
    prisma.handover.findUniqueOrThrow.mockResolvedValue({
      ...handover,
      items: [],
      evidences: [],
    });
    prisma.systemConfig.findUnique.mockResolvedValue(null);
    prisma.handoverQrSession.updateMany.mockResolvedValue({ count: 1 });
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

  it('notifies the renter when a delivery handover session starts', async () => {
    prisma.handover.create.mockResolvedValue({
      id: handover.id,
      items: [],
      evidences: [],
    });

    const result = await service.startHandover(rental.id, ownerUser, {
      type: HandoverType.DELIVERY,
      notes: 'Meet at the studio lobby',
    });

    expect(prisma.handover.create).toHaveBeenCalled();
    expect(notificationsService.createMany).toHaveBeenCalledWith([renterUser.id], {
      type: NotificationType.HANDOVER_READY,
      title: 'Phiên bàn giao đã sẵn sàng',
      content:
        'Chủ tài sản đã bắt đầu phiên bàn giao cho "Canon R6". Vui lòng kiểm tra và xác nhận khi nhận tài sản.',
      referenceType: 'rental',
      referenceId: rental.id,
    });
    expect(result.id).toBe(handover.id);
  });

  it('generates a short-lived QR session for a delivery handover', async () => {
    prisma.handoverQrSession.create.mockResolvedValue({
      id: 'qr-1',
      token: 'token-1',
      expiresAt: new Date('2026-08-12T10:10:00.000Z'),
    });

    const result = await service.generateHandoverQr(
      rental.id,
      handover.id,
      ownerUser,
    );

    expect(prisma.handoverQrSession.create).toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        handoverId: handover.id,
        rentalId: rental.id,
        token: 'token-1',
      }),
    );
  });

  it('rejects QR generation for non-delivery handovers', async () => {
    prisma.handover.findUnique.mockResolvedValue({
      ...handover,
      type: HandoverType.RETURN,
    });

    await expect(
      service.generateHandoverQr(rental.id, handover.id, ownerUser),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects expired QR tokens', async () => {
    prisma.handoverQrSession.findUnique.mockResolvedValue({
      id: 'qr-2',
      token: 'expired-token',
      usedAt: null,
      expiresAt: new Date('2026-08-12T09:00:00.000Z'),
      handover,
      rental,
    });

    await expect(
      service.confirmHandoverByQr(renterUser, {
        token: 'expired-token',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirms handover through QR and marks the session used', async () => {
    prisma.handoverQrSession.findUnique.mockResolvedValue({
      id: 'qr-3',
      token: 'active-token',
      usedAt: null,
      expiresAt: new Date('2026-08-13T12:00:00.000Z'),
      handover,
      rental,
    });
    prisma.handover.update.mockResolvedValue({});
    prisma.rentalRequest.update.mockResolvedValue({
      ...rental,
      status: RentalStatus.ONGOING,
    });

    const result = await service.confirmHandoverByQr(renterUser, {
      token: 'active-token',
      notes: 'Scanned via QR',
    });

    expect(prisma.handoverQrSession.updateMany).toHaveBeenCalled();
    expect(prisma.handover.update).toHaveBeenCalled();
    expect(result.status).toBe(RentalStatus.ONGOING);
  });

  it('throws when QR session is missing', async () => {
    prisma.handoverQrSession.findUnique.mockResolvedValue(null);

    await expect(
      service.confirmHandoverByQr(renterUser, { token: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
