import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
    );
  });

  it('allows the renter to accept an owner damage report and restores payout flow', async () => {
    const result = await service.acceptDamageReport('dispute-1', renterUser, {});

    expect(prisma.disputeEvent.create).toHaveBeenCalledWith({
      data: {
        disputeId: 'dispute-1',
        actorId: renterUser.id,
        eventType: 'RESOLVED',
        content: 'Renter accepted the reported damage.',
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
});
