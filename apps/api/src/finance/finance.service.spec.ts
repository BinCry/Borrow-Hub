import { BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  NotificationType,
  PaymentStatus,
  PayoutStatus,
  RefundStatus,
  RoleName,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  const adminUser: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@example.com',
    fullName: 'Admin User',
    roles: [RoleName.ADMIN],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const ownerUser: AuthenticatedUser = {
    id: 'owner-1',
    email: 'owner@example.com',
    fullName: 'Owner User',
    roles: [RoleName.USER],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const payout = {
    id: 'payout-1',
    ownerId: ownerUser.id,
    status: PayoutStatus.PENDING,
    paidAt: null,
    rental: {
      asset: {
        title: 'Canon R6',
      },
      renter: {
        id: 'renter-1',
        fullName: 'Renter User',
        email: 'renter@example.com',
      },
      payments: [],
    },
    owner: {
      id: ownerUser.id,
      fullName: ownerUser.fullName,
      email: ownerUser.email,
    },
  };

  const prisma = {
    payment: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    refund: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  let service: FinanceService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payout.findUnique.mockResolvedValue(payout);
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    service = new FinanceService(
      prisma as never,
      auditService as never,
      notificationsService as never,
    );
  });

  it('notifies the owner when a payout is marked as paid', async () => {
    prisma.payout.update.mockResolvedValue({
      ...payout,
      status: PayoutStatus.PAID,
      paidAt: new Date('2026-08-13T08:00:00.000Z'),
    });

    const result = await service.updatePayoutStatus(payout.id, adminUser, {
      status: PayoutStatus.PAID,
    });

    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: payout.id },
      data: {
        status: PayoutStatus.PAID,
        paidAt: expect.any(Date),
      },
      include: expect.any(Object),
    });
    expect(notificationsService.createMany).toHaveBeenCalledWith([ownerUser.id], {
      type: NotificationType.PAYOUT_COMPLETED,
      title: 'Payout đã hoàn tất',
      content: 'Payout cho đơn "Canon R6" đã được ghi nhận thành công.',
      referenceType: 'payout',
      referenceId: payout.id,
    });
    expect(auditService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        afterData: expect.objectContaining({
          status: PayoutStatus.PAID,
        }),
      }),
    );
    expect(result.status).toBe(PayoutStatus.PAID);
  });

  it('does not re-notify when payout was already paid', async () => {
    prisma.payout.findUnique.mockResolvedValue({
      ...payout,
      status: PayoutStatus.PAID,
      paidAt: new Date('2026-08-12T08:00:00.000Z'),
    });
    prisma.payout.update.mockResolvedValue({
      ...payout,
      status: PayoutStatus.PAID,
      paidAt: new Date('2026-08-12T08:00:00.000Z'),
    });

    await service.updatePayoutStatus(payout.id, adminUser, {
      status: PayoutStatus.PAID,
    });

    expect(notificationsService.createMany).not.toHaveBeenCalled();
  });

  it('rejects payout status updates from non-finance users', async () => {
    await expect(
      service.updatePayoutStatus(payout.id, ownerUser, {
        status: PayoutStatus.PAID,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rechecks the refundable balance while holding the payment lock', async () => {
    prisma.payment.findUnique.mockResolvedValue(createPayment());
    prisma.payment.findUnique
      .mockResolvedValueOnce(createPayment())
      .mockResolvedValueOnce({
        amount: 1_000,
        status: PaymentStatus.SUCCESS,
        refunds: [
          { amount: 800, status: RefundStatus.PENDING },
        ],
      });

    await expect(
      service.createRefund('payment-1', adminUser, {
        amount: 300,
        reason: 'Partial order issue',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.refund.create).not.toHaveBeenCalled();
  });

  it('keeps payment settled while a refund is only pending', async () => {
    const payment = createPayment();
    prisma.payment.findUnique
      .mockResolvedValueOnce(payment)
      .mockResolvedValueOnce({
        amount: payment.amount,
        status: payment.status,
        refunds: [],
      });
    prisma.refund.create.mockResolvedValue({
      id: 'refund-1',
      paymentId: payment.id,
      amount: 300,
      reason: 'Partial order issue',
      status: RefundStatus.PENDING,
    });
    prisma.payment.findUniqueOrThrow.mockResolvedValue(payment);

    await service.createRefund(payment.id, adminUser, {
      amount: 300,
      reason: 'Partial order issue',
    });

    expect(prisma.refund.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ status: RefundStatus.PENDING }),
    });
    expect(prisma.payment.update).not.toHaveBeenCalled();
    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: { status: PayoutStatus.BLOCKED },
    });
  });

  it('updates payment state only after the refund completes', async () => {
    const payment = createPayment();
    prisma.refund.findUnique.mockResolvedValue({
      id: 'refund-1',
      paymentId: payment.id,
      amount: 300,
      status: RefundStatus.PENDING,
      payment: {
        ...payment,
        refunds: [
          {
            id: 'refund-1',
            amount: 300,
            status: RefundStatus.PENDING,
          },
        ],
      },
    });
    prisma.refund.update.mockResolvedValue({
      id: 'refund-1',
      amount: 300,
      status: RefundStatus.COMPLETED,
    });
    prisma.payment.findUniqueOrThrow.mockResolvedValue({
      ...payment,
      status: PaymentStatus.PARTIALLY_REFUNDED,
    });

    await service.updateRefundStatus('refund-1', adminUser, {
      status: RefundStatus.COMPLETED,
    });

    expect(prisma.payment.update).toHaveBeenCalledWith({
      where: { id: payment.id },
      data: { status: PaymentStatus.PARTIALLY_REFUNDED },
    });
    expect(prisma.payout.update).toHaveBeenCalledWith({
      where: { id: 'payout-1' },
      data: { status: PayoutStatus.BLOCKED },
    });
  });

  function createPayment() {
    return {
      id: 'payment-1',
      payerId: 'renter-1',
      amount: 1_000,
      currency: 'VND',
      status: PaymentStatus.SUCCESS,
      refunds: [],
      rental: {
        ownerId: ownerUser.id,
        asset: { title: 'Canon R6' },
        payout: { id: 'payout-1' },
      },
    };
  }
});
