import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  RoleName,
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { SupportService } from './support.service';

describe('SupportService', () => {
  const requester: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'Requester User',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const supportAgent: AuthenticatedUser = {
    id: 'staff-1',
    email: 'support@example.com',
    fullName: 'Support Agent',
    roles: [RoleName.CUSTOMER_SUPPORT],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
    },
    dispute: {
      findUnique: jest.fn(),
    },
    report: {
      findUnique: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    supportTicket: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    supportTicketEvent: {
      create: jest.fn(),
    },
  };

  const auditService = {
    create: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  let service: SupportService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rentalRequest.findUnique.mockResolvedValue(null);
    prisma.dispute.findUnique.mockResolvedValue(null);
    prisma.report.findUnique.mockResolvedValue(null);
    service = new SupportService(
      prisma as never,
      auditService as never,
      notificationsService as never,
    );
  });

  it('creates a support ticket for an accessible rental', async () => {
    prisma.rentalRequest.findUnique.mockResolvedValue({
      id: 'rental-1',
      ownerId: 'owner-1',
      renterId: requester.id,
    });
    prisma.supportTicket.create.mockResolvedValue({
      id: 'ticket-1',
      requesterId: requester.id,
      subject: 'Need help',
      description: 'Rental issue',
      priority: SupportTicketPriority.HIGH,
      rentalId: 'rental-1',
      disputeId: null,
      reportId: null,
      events: [],
    });

    const result = await service.create(requester, {
      subject: 'Need help',
      description: 'Rental issue',
      priority: SupportTicketPriority.HIGH,
      rentalId: 'rental-1',
    });

    expect(prisma.supportTicket.create).toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalled();
    expect(result.id).toBe('ticket-1');
  });

  it('rejects assigning a ticket to a non-support account', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      requesterId: requester.id,
      assignedToId: null,
      status: SupportTicketStatus.OPEN,
      events: [],
    });
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      userRoles: [
        {
          role: {
            name: RoleName.USER,
          },
        },
      ],
    });

    await expect(
      service.assign('ticket-1', supportAgent, {
        assignedToId: 'user-2',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('prevents a stranger from reading another user ticket', async () => {
    prisma.supportTicket.findUnique.mockResolvedValue({
      id: 'ticket-1',
      requesterId: requester.id,
      assignedToId: null,
      events: [],
    });

    await expect(
      service.getById('ticket-1', {
        ...requester,
        id: 'stranger-1',
        email: 'stranger@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('throws when linked dispute does not exist', async () => {
    await expect(
      service.create(requester, {
        subject: 'Dispute follow-up',
        description: 'Please review',
        disputeId: 'missing-dispute',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
