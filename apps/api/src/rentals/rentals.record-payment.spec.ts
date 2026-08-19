import { PaymentProvider, PaymentStatus, RentalStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RentalsService } from './rentals.service';

describe('RentalsService recordPayment', () => {
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
    startAt: new Date('2026-08-20T02:00:00.000Z'),
    endAt: new Date('2026-08-22T02:00:00.000Z'),
    updatedAt: new Date(),
    rentalFee: 600000,
    serviceFee: 30000,
    deliveryFee: 0,
    lateFee: 0,
    totalAmount: 630000,
    currency: 'VND',
    status: RentalStatus.AWAITING_PAYMENT,
    asset: {
      id: 'asset-1',
      title: 'Canon R6',
      images: [],
      serialNumber: 'SERIAL-001',
      pricePerDay: 300000,
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
  };

  const pendingPayment = {
    id: 'payment-1',
    rentalId: rental.id,
    payerId: renterUser.id,
    provider: PaymentProvider.SANDBOX,
    providerTransactionId: 'intent:SANDBOX:BHRENTAL1',
    amount: rental.totalAmount,
    currency: 'VND',
    status: PaymentStatus.PENDING,
  };

  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      upsert: jest.fn(),
    },
    rentalContract: {
      upsert: jest.fn(),
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
    assessCancellationPattern: jest.fn(),
  };
  const trustScoreService = {
    recalculateUserTrustScore: jest.fn(),
  };

  let service: RentalsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rentalRequest.findUnique.mockImplementation(
      ({ select }: { select?: { status?: boolean } }) =>
        select?.status ? { status: RentalStatus.AWAITING_PAYMENT } : rental,
    );
    prisma.rentalRequest.update.mockResolvedValue({
      ...rental,
      status: RentalStatus.AWAITING_SIGNATURE,
    });
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.payment.create.mockResolvedValue(pendingPayment);
    prisma.payment.findUnique
      .mockResolvedValueOnce({ rental: { rentalFee: rental.rentalFee } })
      .mockResolvedValueOnce(pendingPayment);
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

  it('settles a sandbox payment once and emits payment and contract notifications', async () => {
    await service.recordPayment(rental.id, renterUser, {
      providerTransactionId: 'sandbox-rental-1',
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        rentalId: rental.id,
        payerId: renterUser.id,
        provider: PaymentProvider.SANDBOX,
        providerTransactionId: 'intent:SANDBOX:BHRENTAL1',
        amount: rental.totalAmount,
        currency: 'VND',
        status: PaymentStatus.PENDING,
      },
    });
    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: pendingPayment.id },
      data: expect.objectContaining({
        providerTransactionId: 'sandbox:sandbox-rental-1',
        status: PaymentStatus.SUCCESS,
        paidAt: expect.any(Date),
        metadata: { sandbox: true },
      }),
    });
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(
      1,
      [renterUser.id],
      {
        type: 'PAYMENT_SUCCESS',
        title: 'Thanh toán thành công',
        content:
          'Thanh toán cho đơn thuê "Canon R6" đã được ghi nhận thành công.',
        metadata: {
          rentalId: rental.id,
          assetId: rental.assetId,
        },
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(
      2,
      [ownerUser.id, renterUser.id],
      expect.objectContaining({ type: 'CONTRACT_READY' }),
    );
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(
      3,
      [ownerUser.id, renterUser.id],
      expect.objectContaining({ type: 'SIGNATURE_REQUIRED' }),
    );
    expect(analyticsService.track).toHaveBeenCalled();
  });
});
