import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DisputeEventType,
  DisputeStatus,
  HandoverStatus,
  HandoverType,
  NotificationType,
  Prisma,
  RentalStatus,
  RoleName,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  AssignDisputeDto,
  CreateDisputeDto,
  DisputeQueryDto,
  RespondDisputeDto,
  UpdateDisputeStatusDto,
} from './disputes.dto';

const ACTIVE_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.OPEN,
  DisputeStatus.WAITING_RESPONSE,
  DisputeStatus.UNDER_REVIEW,
];

const TERMINAL_DISPUTE_STATUSES: DisputeStatus[] = [
  DisputeStatus.RESOLVED,
  DisputeStatus.REJECTED,
  DisputeStatus.CLOSED,
];

@Injectable()
export class DisputesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(currentUser: AuthenticatedUser, dto: CreateDisputeDto) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: dto.rentalId },
      include: this.rentalAccessInclude(),
    });

    if (!rental) {
      throw new NotFoundException('Rental request not found');
    }

    if (
      ![rental.ownerId, rental.renterId].includes(currentUser.id) &&
      !this.isStaff(currentUser)
    ) {
      throw new ForbiddenException('You cannot open a dispute for this rental');
    }

    const existing = await this.prisma.dispute.findFirst({
      where: {
        rentalId: rental.id,
        status: {
          in: ACTIVE_DISPUTE_STATUSES,
        },
      },
    });

    if (existing) {
      throw new ConflictException('This rental already has an active dispute');
    }

    const evidenceRecords = await this.loadEvidenceForRental(
      rental.id,
      dto.evidenceIds,
      currentUser.id,
    );

    const dispute = await this.prisma.$transaction(async (tx) => {
      const created = await tx.dispute.create({
        data: {
          rentalId: rental.id,
          openedById: currentUser.id,
          reason: dto.reason,
          description: dto.description,
          status: DisputeStatus.OPEN,
          events: {
            create: {
              actorId: currentUser.id,
              eventType: DisputeEventType.OPENED,
              content: dto.description,
              metadata: {
                reason: dto.reason,
              },
            },
          },
          evidences: evidenceRecords.length
            ? {
                create: evidenceRecords.map((evidence) => ({
                  evidenceId: evidence.id,
                  uploadedById: currentUser.id,
                })),
              }
            : undefined,
        },
        include: this.disputeInclude(),
      });

      await tx.rentalRequest.update({
        where: { id: rental.id },
        data: {
          status: RentalStatus.DISPUTED,
        },
      });

      return created;
    });

    await this.notificationsService.createMany(
      [rental.ownerId, rental.renterId].filter(
        (userId) => userId !== currentUser.id,
      ),
      {
        type: NotificationType.SYSTEM,
        title: 'Dispute mới được mở',
        content: `${currentUser.fullName} vừa mở dispute cho đơn thuê "${rental.asset.title}".`,
        referenceType: 'dispute',
        referenceId: dispute.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.create',
      entityType: 'dispute',
      entityId: dispute.id,
      afterData: {
        rentalId: rental.id,
        status: dispute.status,
        reason: dispute.reason,
      },
    });

    return dispute;
  }

  listMine(currentUser: AuthenticatedUser, query: DisputeQueryDto) {
    const where: Prisma.DisputeWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...this.buildScopeFilter(currentUser, query.role),
    };

    return this.prisma.dispute.findMany({
      where,
      include: this.disputeInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getById(disputeId: string, currentUser: AuthenticatedUser) {
    return this.findAccessibleDispute(disputeId, currentUser);
  }

  async respond(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: RespondDisputeDto,
  ) {
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);
    this.ensureMutable(dispute.status);

    const evidenceRecords = await this.loadEvidenceForRental(
      dispute.rentalId,
      dto.evidenceIds,
      currentUser.id,
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: DisputeEventType.RESPONSE_ADDED,
          content: dto.content,
        },
      });

      if (evidenceRecords.length) {
        await tx.disputeEvidence.createMany({
          data: evidenceRecords.map((evidence) => ({
            disputeId: dispute.id,
            evidenceId: evidence.id,
            uploadedById: currentUser.id,
          })),
          skipDuplicates: true,
        });

        await tx.disputeEvent.create({
          data: {
            disputeId: dispute.id,
            actorId: currentUser.id,
            eventType: DisputeEventType.EVIDENCE_ATTACHED,
            content: `Attached ${evidenceRecords.length} evidence item(s)`,
          },
        });
      }

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status:
            dispute.status === DisputeStatus.OPEN
              ? DisputeStatus.WAITING_RESPONSE
              : DisputeStatus.UNDER_REVIEW,
        },
      });

      return tx.dispute.findUniqueOrThrow({
        where: { id: dispute.id },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Dispute có phản hồi mới',
        content: `${currentUser.fullName} vừa cập nhật dispute cho đơn "${updated.rental.asset.title}".`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.respond',
      entityType: 'dispute',
      entityId: updated.id,
      afterData: {
        status: updated.status,
        respondedWithEvidence: evidenceRecords.length > 0,
      },
    });

    return updated;
  }

  async assign(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: AssignDisputeDto,
  ) {
    this.assertDisputeManager(currentUser);
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);

    if (dto.assignedToId) {
      const assignee = await this.prisma.user.findUnique({
        where: { id: dto.assignedToId },
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

      const assigneeRoles = assignee.userRoles.map(({ role }) => role.name);
      if (
        !assigneeRoles.some((role) =>
          this.disputeManagerRoles().includes(role),
        )
      ) {
        throw new BadRequestException('Assignee must be a staff account');
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextStatus =
        dispute.status === DisputeStatus.OPEN ||
        dispute.status === DisputeStatus.WAITING_RESPONSE
          ? DisputeStatus.UNDER_REVIEW
          : dispute.status;

      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: DisputeEventType.ASSIGNED,
          content: dto.assignedToId
            ? `Assigned dispute to ${dto.assignedToId}`
            : 'Unassigned dispute',
        },
      });

      return tx.dispute.update({
        where: { id: dispute.id },
        data: {
          assignedToId: dto.assignedToId ?? null,
          status: nextStatus,
        },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Dispute được phân công xử lý',
        content: `Dispute cho đơn "${updated.rental.asset.title}" vừa được cập nhật người phụ trách.`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.assign',
      entityType: 'dispute',
      entityId: updated.id,
      beforeData: { assignedToId: dispute.assignedToId },
      afterData: { assignedToId: updated.assignedToId, status: updated.status },
    });

    return updated;
  }

  async updateStatus(
    disputeId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateDisputeStatusDto,
  ) {
    this.assertDisputeManager(currentUser);
    const dispute = await this.findAccessibleDispute(disputeId, currentUser);

    if (
      TERMINAL_DISPUTE_STATUSES.includes(dto.status) &&
      !dto.resolutionSummary
    ) {
      throw new BadRequestException(
        'resolutionSummary is required for terminal dispute statuses',
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const returnConfirmed = dispute.rental.handovers.some(
        (handover) =>
          handover.type === HandoverType.RETURN &&
          handover.status === HandoverStatus.CONFIRMED,
      );

      await tx.disputeEvent.create({
        data: {
          disputeId: dispute.id,
          actorId: currentUser.id,
          eventType: TERMINAL_DISPUTE_STATUSES.includes(dto.status)
            ? DisputeEventType.RESOLVED
            : DisputeEventType.STATUS_CHANGED,
          content: dto.note ?? `Dispute status changed to ${dto.status}`,
          metadata: dto.resolutionSummary
            ? {
                resolutionSummary: dto.resolutionSummary,
              }
            : undefined,
        },
      });

      await tx.dispute.update({
        where: { id: dispute.id },
        data: {
          status: dto.status,
          resolutionSummary: dto.resolutionSummary ?? dispute.resolutionSummary,
          resolvedAt: TERMINAL_DISPUTE_STATUSES.includes(dto.status)
            ? new Date()
            : null,
        },
      });

      await tx.rentalRequest.update({
        where: { id: dispute.rentalId },
        data: {
          status:
            TERMINAL_DISPUTE_STATUSES.includes(dto.status) && returnConfirmed
              ? RentalStatus.COMPLETED
              : RentalStatus.DISPUTED,
        },
      });

      return tx.dispute.findUniqueOrThrow({
        where: { id: dispute.id },
        include: this.disputeInclude(),
      });
    });

    await this.notificationsService.createMany(
      this.collectDisputeWatchers(updated, currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Dispute đổi trạng thái',
        content: `Dispute cho đơn "${updated.rental.asset.title}" đã chuyển sang ${updated.status}.`,
        referenceType: 'dispute',
        referenceId: updated.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.status.update',
      entityType: 'dispute',
      entityId: updated.id,
      beforeData: { status: dispute.status },
      afterData: {
        status: updated.status,
        resolutionSummary: updated.resolutionSummary,
      },
    });

    return updated;
  }

  private async findAccessibleDispute(
    disputeId: string,
    currentUser: AuthenticatedUser,
  ) {
    const dispute = await this.prisma.dispute.findUnique({
      where: { id: disputeId },
      include: this.disputeInclude(),
    });

    if (!dispute) {
      throw new NotFoundException('Dispute not found');
    }

    const canAccess =
      dispute.openedById === currentUser.id ||
      dispute.rental.ownerId === currentUser.id ||
      dispute.rental.renterId === currentUser.id ||
      dispute.assignedToId === currentUser.id ||
      this.isStaff(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this dispute');
    }

    return dispute;
  }

  private async loadEvidenceForRental(
    rentalId: string,
    evidenceIds: string[] | undefined,
    currentUserId: string,
  ) {
    if (!evidenceIds?.length) {
      return [];
    }

    const evidences = await this.prisma.evidence.findMany({
      where: {
        id: {
          in: evidenceIds,
        },
        rentalId,
      },
    });

    if (evidences.length !== evidenceIds.length) {
      throw new BadRequestException(
        'Some evidence items were not found for this rental',
      );
    }

    const unauthorized = evidences.some(
      (evidence) =>
        evidence.uploadedBy !== currentUserId && evidence.handoverId === null,
    );

    if (unauthorized) {
      throw new ForbiddenException(
        'You can only attach your own standalone evidence records',
      );
    }

    return evidences;
  }

  private ensureMutable(status: DisputeStatus) {
    if (TERMINAL_DISPUTE_STATUSES.includes(status)) {
      throw new ConflictException('This dispute has already been closed');
    }
  }

  private buildScopeFilter(
    currentUser: AuthenticatedUser,
    role: DisputeQueryDto['role'],
  ): Prisma.DisputeWhereInput {
    if (role === 'opened') {
      return { openedById: currentUser.id };
    }

    if (role === 'assigned') {
      if (!this.isStaff(currentUser)) {
        return { id: '__no_results__' };
      }

      return { assignedToId: currentUser.id };
    }

    return {
      OR: [
        { openedById: currentUser.id },
        { rental: { ownerId: currentUser.id } },
        { rental: { renterId: currentUser.id } },
        ...(this.isStaff(currentUser)
          ? [{ assignedToId: currentUser.id }]
          : []),
      ],
    };
  }

  private collectDisputeWatchers(
    dispute: Awaited<ReturnType<DisputesService['findAccessibleDispute']>>,
    actorId: string,
  ) {
    return [...new Set([
      dispute.openedById,
      dispute.rental.ownerId,
      dispute.rental.renterId,
      dispute.assignedToId,
    ])].filter(
      (userId): userId is string => Boolean(userId && userId !== actorId),
    );
  }

  private disputeInclude() {
    return {
      rental: {
        include: {
          asset: true,
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          handovers: true,
        },
      },
      openedBy: {
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
      evidences: {
        include: {
          evidence: true,
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
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
    } satisfies Prisma.DisputeInclude;
  }

  private rentalAccessInclude() {
    return {
      asset: true,
      owner: true,
      renter: true,
    } satisfies Prisma.RentalRequestInclude;
  }

  private assertDisputeManager(currentUser: AuthenticatedUser) {
    if (
      !currentUser.roles.some((role) =>
        this.disputeManagerRoles().includes(role),
      )
    ) {
      throw new ForbiddenException('Only dispute staff can perform this action');
    }
  }

  private disputeManagerRoles(): RoleName[] {
    return [
      RoleName.DISPUTE_OFFICER,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];
  }

  private isStaff(currentUser: AuthenticatedUser) {
    const staffRoles: RoleName[] = [
      RoleName.MODERATOR,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.DISPUTE_OFFICER,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];

    return currentUser.roles.some((role) => staffRoles.includes(role));
  }
}
