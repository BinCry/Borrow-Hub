import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  RoleName,
  SupportTicketEventType,
  SupportTicketPriority,
  SupportTicketStatus,
  type SupportTicket,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AddSupportTicketNoteDto,
  AssignSupportTicketDto,
  CreateSupportTicketDto,
  SupportTicketQueryDto,
  UpdateSupportTicketStatusDto,
} from './support.dto';

const RESOLVED_SUPPORT_STATUSES: SupportTicketStatus[] = [
  SupportTicketStatus.RESOLVED,
  SupportTicketStatus.CLOSED,
];

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  list(currentUser: AuthenticatedUser, query: SupportTicketQueryDto) {
    const where: Prisma.SupportTicketWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(query.priority ? { priority: query.priority } : {}),
      ...this.buildScopeFilter(currentUser, query.scope),
    };

    return this.prisma.supportTicket.findMany({
      where,
      include: this.ticketInclude(),
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async create(currentUser: AuthenticatedUser, dto: CreateSupportTicketDto) {
    const linkedEntityData = await this.resolveLinkedEntities(currentUser, dto);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        requesterId: currentUser.id,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority ?? SupportTicketPriority.MEDIUM,
        rentalId: linkedEntityData.rentalId,
        disputeId: linkedEntityData.disputeId,
        reportId: linkedEntityData.reportId,
        events: {
          create: {
            actorId: currentUser.id,
            eventType: SupportTicketEventType.CREATED,
            content: dto.description,
            metadata: {
              subject: dto.subject,
              linkedEntityData,
            },
          },
        },
      },
      include: this.ticketInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'support.ticket.create',
      entityType: 'support_ticket',
      entityId: ticket.id,
      afterData: {
        subject: ticket.subject,
        priority: ticket.priority,
        rentalId: ticket.rentalId,
        disputeId: ticket.disputeId,
        reportId: ticket.reportId,
      },
    });

    return ticket;
  }

  getById(ticketId: string, currentUser: AuthenticatedUser) {
    return this.findAccessibleTicket(ticketId, currentUser);
  }

  async assign(
    ticketId: string,
    currentUser: AuthenticatedUser,
    dto: AssignSupportTicketDto,
  ) {
    this.assertSupportManager(currentUser);
    const ticket = await this.findAccessibleTicket(ticketId, currentUser);

    if (dto.assignedToId) {
      await this.ensureAssignableStaff(dto.assignedToId);
    }

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: dto.assignedToId ?? null,
        status:
          ticket.status === SupportTicketStatus.OPEN
            ? SupportTicketStatus.IN_PROGRESS
            : ticket.status,
        events: {
          create: {
            actorId: currentUser.id,
            eventType: SupportTicketEventType.ASSIGNED,
            content: dto.assignedToId
              ? `Assigned ticket to ${dto.assignedToId}`
              : 'Cleared assignee',
            metadata: {
              previousAssignedToId: ticket.assignedToId,
              assignedToId: dto.assignedToId ?? null,
            },
          },
        },
      },
      include: this.ticketInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'support.ticket.assign',
      entityType: 'support_ticket',
      entityId: updated.id,
      beforeData: { assignedToId: ticket.assignedToId, status: ticket.status },
      afterData: { assignedToId: updated.assignedToId, status: updated.status },
    });

    await this.notificationsService.createMany(
      [ticket.requesterId, updated.assignedToId]
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Support ticket updated',
        content: `Support ticket ${updated.id} has a new assignee update.`,
        referenceType: 'support_ticket',
        referenceId: updated.id,
      },
    );

    return updated;
  }

  async updateStatus(
    ticketId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateSupportTicketStatusDto,
  ) {
    const ticket = await this.findAccessibleTicket(ticketId, currentUser);
    this.assertCanCollaborate(ticket, currentUser);

    const updated = await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: {
        status: dto.status,
        resolvedAt: RESOLVED_SUPPORT_STATUSES.includes(dto.status)
          ? new Date()
          : null,
        events: {
          create: {
            actorId: currentUser.id,
            eventType: SupportTicketEventType.STATUS_CHANGED,
            content: `Status changed from ${ticket.status} to ${dto.status}`,
            metadata: {
              previousStatus: ticket.status,
              nextStatus: dto.status,
            },
          },
        },
      },
      include: this.ticketInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'support.ticket.status.update',
      entityType: 'support_ticket',
      entityId: updated.id,
      beforeData: { status: ticket.status },
      afterData: { status: updated.status, resolvedAt: updated.resolvedAt },
    });

    await this.notificationsService.createMany(
      [ticket.requesterId, ticket.assignedToId]
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Support ticket status changed',
        content: `Support ticket ${updated.id} is now ${updated.status}.`,
        referenceType: 'support_ticket',
        referenceId: updated.id,
      },
    );

    return updated;
  }

  async addNote(
    ticketId: string,
    currentUser: AuthenticatedUser,
    dto: AddSupportTicketNoteDto,
  ) {
    const ticket = await this.findAccessibleTicket(ticketId, currentUser);
    this.assertCanCollaborate(ticket, currentUser);

    await this.prisma.supportTicketEvent.create({
      data: {
        ticketId: ticket.id,
        actorId: currentUser.id,
        eventType: SupportTicketEventType.NOTE,
        content: dto.content,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'support.ticket.note.create',
      entityType: 'support_ticket',
      entityId: ticket.id,
      afterData: { content: dto.content },
    });

    await this.notificationsService.createMany(
      [ticket.requesterId, ticket.assignedToId]
        .filter((userId): userId is string => Boolean(userId))
        .filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'New support ticket note',
        content: `${currentUser.fullName} added a note to support ticket ${ticket.id}.`,
        referenceType: 'support_ticket',
        referenceId: ticket.id,
      },
    );

    return this.findAccessibleTicket(ticket.id, currentUser);
  }

  private async findAccessibleTicket(
    ticketId: string,
    currentUser: AuthenticatedUser,
  ) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: this.ticketInclude(),
    });

    if (!ticket) {
      throw new NotFoundException('Support ticket not found');
    }

    const canAccess =
      ticket.requesterId === currentUser.id ||
      ticket.assignedToId === currentUser.id ||
      this.isSupportStaff(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this support ticket');
    }

    return ticket;
  }

  private async resolveLinkedEntities(
    currentUser: AuthenticatedUser,
    dto: CreateSupportTicketDto,
  ) {
    if (!dto.rentalId && !dto.disputeId && !dto.reportId) {
      return {
        rentalId: null,
        disputeId: null,
        reportId: null,
      };
    }

    const [rental, dispute, report] = await Promise.all([
      dto.rentalId
        ? this.prisma.rentalRequest.findUnique({
            where: { id: dto.rentalId },
          })
        : Promise.resolve(null),
      dto.disputeId
        ? this.prisma.dispute.findUnique({
            where: { id: dto.disputeId },
          })
        : Promise.resolve(null),
      dto.reportId
        ? this.prisma.report.findUnique({
            where: { id: dto.reportId },
          })
        : Promise.resolve(null),
    ]);

    if (dto.rentalId && !rental) {
      throw new NotFoundException('Rental request not found');
    }

    if (dto.disputeId && !dispute) {
      throw new NotFoundException('Dispute not found');
    }

    if (dto.reportId && !report) {
      throw new NotFoundException('Report not found');
    }

    if (
      rental &&
      !this.isSupportStaff(currentUser) &&
      ![rental.ownerId, rental.renterId].includes(currentUser.id)
    ) {
      throw new ForbiddenException('You cannot open a ticket for this rental');
    }

    if (
      dispute &&
      !this.isSupportStaff(currentUser) &&
      dispute.openedById !== currentUser.id &&
      dispute.assignedToId !== currentUser.id
    ) {
      throw new ForbiddenException('You cannot open a ticket for this dispute');
    }

    if (
      report &&
      !this.isSupportStaff(currentUser) &&
      report.reporterId !== currentUser.id &&
      report.assignedToId !== currentUser.id
    ) {
      throw new ForbiddenException('You cannot open a ticket for this report');
    }

    return {
      rentalId: rental?.id ?? null,
      disputeId: dispute?.id ?? null,
      reportId: report?.id ?? null,
    };
  }

  private async ensureAssignableStaff(userId: string) {
    const assignee = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        userRoles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!assignee) {
      throw new NotFoundException('Assignee not found');
    }

    const assigneeRoles = assignee.userRoles.map((userRole) => userRole.role.name);
    if (!assigneeRoles.some((role) => this.assignableSupportRoles().includes(role))) {
      throw new BadRequestException('Assignee must be support staff');
    }
  }

  private ticketInclude() {
    return {
      requester: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      assignedTo: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      rental: {
        select: {
          id: true,
          status: true,
          asset: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      },
      dispute: {
        select: {
          id: true,
          status: true,
        },
      },
      report: {
        select: {
          id: true,
          status: true,
          targetType: true,
        },
      },
      events: {
        include: {
          actor: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'asc' as const }],
      },
    } satisfies Prisma.SupportTicketInclude;
  }

  private buildScopeFilter(
    currentUser: AuthenticatedUser,
    scope: SupportTicketQueryDto['scope'],
  ): Prisma.SupportTicketWhereInput {
    if (scope === 'requested') {
      return { requesterId: currentUser.id };
    }

    if (scope === 'assigned') {
      if (!this.isSupportStaff(currentUser)) {
        return { id: '__no_results__' };
      }

      return { assignedToId: currentUser.id };
    }

    if (scope === 'all' && this.isSupportStaff(currentUser)) {
      return {};
    }

    return {
      OR: [
        { requesterId: currentUser.id },
        ...(this.isSupportStaff(currentUser)
          ? [{ assignedToId: currentUser.id }]
          : []),
      ],
    };
  }

  private assertCanCollaborate(
    ticket: Pick<SupportTicket, 'requesterId' | 'assignedToId'>,
    currentUser: AuthenticatedUser,
  ) {
    const canCollaborate =
      ticket.requesterId === currentUser.id ||
      ticket.assignedToId === currentUser.id ||
      this.isSupportStaff(currentUser);

    if (!canCollaborate) {
      throw new ForbiddenException('You cannot update this support ticket');
    }
  }

  private assertSupportManager(currentUser: AuthenticatedUser) {
    if (!this.isSupportStaff(currentUser)) {
      throw new ForbiddenException('Only support staff can manage tickets');
    }
  }

  private assignableSupportRoles(): RoleName[] {
    return [
      RoleName.CUSTOMER_SUPPORT,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];
  }

  private isSupportStaff(currentUser: AuthenticatedUser) {
    return currentUser.roles.some((role) =>
      this.assignableSupportRoles().includes(role),
    );
  }
}
