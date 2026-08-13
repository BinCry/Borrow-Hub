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
    rentalFee: 600000,
    serviceFee: 30000,
    deliveryFee: 0,
    totalAmount: 630000,
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
    payment: {
      create: jest.fn(),
    },
    payout: {
      upsert: jest.fn(),
      update: jest.fn(),
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
    handover: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    handoverQrSession: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      create: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    dispute: {
      findFirst: jest.fn(),
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    payoutQrSession: undefined,
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
    prisma.rentalRequest.update.mockResolvedValue({
      ...rental,
      status: RentalStatus.AWAITING_SIGNATURE,
    });
    prisma.rentalContract.count.mockResolvedValue(0);
    prisma.systemConfig.findUnique.mockResolvedValue(null);
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

  it('emits payment, contract-ready, and signature-required notifications after recording payment', async () => {
    await service.recordPayment(rental.id, renterUser, {
      providerTransactionId: 'sandbox-rental-1',
    });

    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        rentalId: rental.id,
        payerId: renterUser.id,
        provider: PaymentProvider.SANDBOX,
        providerTransactionId: 'sandbox-rental-1',
        amount: rental.totalAmount,
        status: PaymentStatus.SUCCESS,
        paidAt: expect.any(Date),
      }),
    });
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(1, [renterUser.id], {
      type: 'PAYMENT_SUCCESS',
      title: 'Thanh toán thành công',
      content: 'Thanh toán cho đơn thuê "Canon R6" đã được ghi nhận thành công.',
      metadata: {
        rentalId: rental.id,
        assetId: rental.assetId,
      },
      referenceType: 'rental',
      referenceId: rental.id,
    });
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(
      2,
      [ownerUser.id, renterUser.id],
      {
        type: 'CONTRACT_READY',
        title: 'Hợp đồng điện tử đã sẵn sàng',
        content: 'Đơn thuê "Canon R6" đang chờ hai bên ký hợp đồng.',
        metadata: {
          rentalId: rental.id,
          assetId: rental.assetId,
        },
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );
    expect(notificationsService.createMany).toHaveBeenNthCalledWith(
      3,
      [ownerUser.id, renterUser.id],
      {
        type: 'SIGNATURE_REQUIRED',
        title: 'Cần ký hợp đồng điện tử',
        content: 'Đơn thuê "Canon R6" đang chờ chữ ký của các bên liên quan.',
        metadata: {
          rentalId: rental.id,
          assetId: rental.assetId,
        },
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );
    expect(analyticsService.track).toHaveBeenCalled();
  });
});
