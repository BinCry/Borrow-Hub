import { ForbiddenException } from '@nestjs/common';
import { NotificationType, PayoutStatus, RoleName } from '@prisma/client';
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
      create: jest.fn(),
    },
    payout: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
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
});
