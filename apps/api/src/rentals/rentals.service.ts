import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssetStatus,
  ContractStatus,
  DisputeEventType,
  DisputeStatus,
  HandoverStatus,
  HandoverType,
  NotificationType,
  PaymentProvider,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  RentalStatus,
  ReviewStatus,
  RoleName,
  VerificationStatus,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  ApproveRentalDto,
  ConfirmHandoverDto,
  CreateRentalRequestDto,
  DeclineRentalDto,
  RecordPaymentDto,
  RentalListQueryDto,
  ReportIssueDto,
  SignContractDto,
  StartHandoverDto,
} from './rentals.dto';

@Injectable()
export class RentalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(currentUser: AuthenticatedUser, dto: CreateRentalRequestDto) {
    this.assertVerifiedUser(currentUser);

    const asset = await this.prisma.asset.findUnique({
      where: { id: dto.assetId },
      include: {
        owner: {
          include: {
            verification: true,
          },
        },
      },
    });

    if (!asset || asset.status !== AssetStatus.ACTIVE) {
      throw new NotFoundException('Asset is not available for rental');
    }

    if (asset.ownerId === currentUser.id) {
      throw new ConflictException('You cannot rent your own asset');
    }

    const startAt = new Date(dto.startAt);
    const endAt = new Date(dto.endAt);

    if (Number.isNaN(startAt.getTime()) || Number.isNaN(endAt.getTime())) {
      throw new BadRequestException('Invalid rental time range');
    }

    if (startAt >= endAt) {
      throw new ConflictException('Start time must be before end time');
    }

    const durationInDays = Math.ceil(
      (endAt.getTime() - startAt.getTime()) / (24 * 60 * 60 * 1000),
    );

    if (
      durationInDays < asset.minimumDurationDays ||
      durationInDays > asset.maximumDurationDays
    ) {
      throw new ConflictException(
        'Rental duration is outside the allowed range for this asset',
      );
    }

    await this.ensureNoOverlap(asset.id, startAt, endAt);

    const pricing = await this.computePricing(asset.pricePerDay, durationInDays);

    const rental = await this.prisma.rentalRequest.create({
      data: {
        assetId: asset.id,
        ownerId: asset.ownerId,
        renterId: currentUser.id,
        startAt,
        endAt,
        deliveryMethod: dto.deliveryMethod,
        message: dto.message,
        rentalFee: pricing.rentalFee,
        serviceFee: pricing.serviceFee,
        deliveryFee: pricing.deliveryFee,
        totalAmount: pricing.totalAmount,
        status: RentalStatus.PENDING_OWNER,
      },
      include: this.rentalInclude(),
    });

    await this.notificationsService.createMany([asset.ownerId], {
      type: NotificationType.RENTAL_REQUEST_CREATED,
      title: 'Yêu cầu thuê mới',
      content: `${currentUser.fullName} vừa gửi yêu cầu thuê "${asset.title}".`,
      referenceType: 'rental',
      referenceId: rental.id,
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'rental.create',
      entityType: 'rental',
      entityId: rental.id,
      afterData: {
        status: rental.status,
        assetId: rental.assetId,
      },
    });

    return rental;
  }

  async listMine(currentUser: AuthenticatedUser, query: RentalListQueryDto) {
    const where: Prisma.RentalRequestWhereInput = {
      status: query.status as RentalStatus | undefined,
      ...(query.role === 'owner'
        ? { ownerId: currentUser.id }
        : query.role === 'renter'
          ? { renterId: currentUser.id }
          : {
              OR: [{ ownerId: currentUser.id }, { renterId: currentUser.id }],
            }),
    };

    return this.prisma.rentalRequest.findMany({
      where,
      include: this.rentalInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getById(rentalId: string, currentUser: AuthenticatedUser) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    return rental;
  }

  async approve(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: ApproveRentalDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    this.assertOwner(rental.ownerId, currentUser);
    this.assertStatus(rental.status, [RentalStatus.PENDING_OWNER]);

    const updated = await this.prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: RentalStatus.AWAITING_PAYMENT,
        message: dto.ownerMessage ?? rental.message,
      },
      include: this.rentalInclude(),
    });

    await this.notificationsService.createMany([rental.renterId], {
      type: NotificationType.RENTAL_REQUEST_APPROVED,
      title: 'Yêu cầu thuê đã được chấp nhận',
      content: `Chủ tài sản đã chấp nhận yêu cầu thuê "${rental.asset.title}".`,
      referenceType: 'rental',
      referenceId: rental.id,
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'rental.approve',
      entityType: 'rental',
      entityId: rental.id,
      beforeData: { status: rental.status },
      afterData: { status: updated.status },
    });

    return updated;
  }

  async decline(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: DeclineRentalDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    this.assertOwner(rental.ownerId, currentUser);
    this.assertStatus(rental.status, [RentalStatus.PENDING_OWNER]);

    const updated = await this.prisma.rentalRequest.update({
      where: { id: rentalId },
      data: {
        status: RentalStatus.DECLINED,
        message: dto.reason ?? rental.message,
      },
      include: this.rentalInclude(),
    });

    await this.notificationsService.createMany([rental.renterId], {
      type: NotificationType.RENTAL_REQUEST_DECLINED,
      title: 'Yêu cầu thuê bị từ chối',
      content: `Chủ tài sản đã từ chối yêu cầu thuê "${rental.asset.title}".`,
      referenceType: 'rental',
      referenceId: rental.id,
    });

    return updated;
  }

  async recordPayment(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: RecordPaymentDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    this.assertRenter(rental.renterId, currentUser);
    this.assertStatus(rental.status, [RentalStatus.AWAITING_PAYMENT]);

    const contractNumber = await this.generateContractNumber();
    const contractSnapshot = this.buildContractSnapshot(rental);
    const contractHash = `hash-${rental.id}-v1`;

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          rentalId: rental.id,
          payerId: currentUser.id,
          provider: PaymentProvider.SANDBOX,
          providerTransactionId:
            dto.providerTransactionId ??
            `sandbox-${rental.id}-${Date.now().toString()}`,
          amount: rental.totalAmount,
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
        },
      });

      await tx.payout.upsert({
        where: { rentalId: rental.id },
        update: {
          grossAmount: rental.rentalFee,
          commissionAmount: await this.getOwnerCommissionAmount(rental.rentalFee),
          netAmount:
            rental.rentalFee -
            (await this.getOwnerCommissionAmount(rental.rentalFee)),
          status: PayoutStatus.PENDING,
        },
        create: {
          rentalId: rental.id,
          ownerId: rental.ownerId,
          grossAmount: rental.rentalFee,
          commissionAmount: await this.getOwnerCommissionAmount(rental.rentalFee),
          netAmount:
            rental.rentalFee -
            (await this.getOwnerCommissionAmount(rental.rentalFee)),
          status: PayoutStatus.PENDING,
        },
      });

      await tx.rentalContract.upsert({
        where: { rentalId: rental.id },
        update: {
          contractNumber,
          version: 1,
          snapshot: contractSnapshot,
          contentHash: contractHash,
          status: ContractStatus.PENDING_SIGNATURE,
        },
        create: {
          rentalId: rental.id,
          contractNumber,
          version: 1,
          snapshot: contractSnapshot,
          contentHash: contractHash,
          status: ContractStatus.PENDING_SIGNATURE,
        },
      });

      return tx.rentalRequest.update({
        where: { id: rental.id },
        data: {
          status: RentalStatus.AWAITING_SIGNATURE,
        },
        include: this.rentalInclude(),
      });
    });

    await this.notificationsService.createMany(
      [rental.ownerId, rental.renterId],
      {
        type: NotificationType.CONTRACT_READY,
        title: 'Hợp đồng điện tử đã sẵn sàng',
        content: `Đơn thuê "${rental.asset.title}" đang chờ hai bên ký hợp đồng.`,
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );

    return updated;
  }

  async signContract(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: SignContractDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);

    if (![rental.ownerId, rental.renterId].includes(currentUser.id)) {
      throw new ForbiddenException('You cannot sign this contract');
    }

    this.assertStatus(rental.status, [RentalStatus.AWAITING_SIGNATURE]);

    const contract = rental.contract;
    if (!contract) {
      throw new ConflictException('Rental contract has not been generated');
    }

    await this.prisma.contractSignature.upsert({
      where: {
        contractId_userId: {
          contractId: contract.id,
          userId: currentUser.id,
        },
      },
      update: {
        signatureMethod: dto.signatureMethod,
        signedAt: new Date(),
        signatureReference: dto.signatureReference,
        deviceInfo: dto.deviceInfo,
      },
      create: {
        contractId: contract.id,
        userId: currentUser.id,
        signatureMethod: dto.signatureMethod,
        signatureReference: dto.signatureReference,
        deviceInfo: dto.deviceInfo,
      },
    });

    const signatures = await this.prisma.contractSignature.findMany({
      where: { contractId: contract.id },
    });

    const bothSigned =
      signatures.some((signature) => signature.userId === rental.ownerId) &&
      signatures.some((signature) => signature.userId === rental.renterId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (bothSigned) {
        await tx.rentalContract.update({
          where: { id: contract.id },
          data: {
            status: ContractStatus.ACTIVE,
            activatedAt: new Date(),
          },
        });
      }

      return tx.rentalRequest.update({
        where: { id: rental.id },
        data: {
          status: bothSigned ? RentalStatus.CONFIRMED : RentalStatus.AWAITING_SIGNATURE,
        },
        include: this.rentalInclude(),
      });
    });

    await this.notificationsService.createMany(
      [rental.ownerId, rental.renterId].filter((userId) => userId !== currentUser.id),
      {
        type: bothSigned
          ? NotificationType.RENTAL_CONFIRMED
          : NotificationType.CONTRACT_SIGNED,
        title: bothSigned ? 'Đơn thuê đã được xác nhận' : 'Hợp đồng đã có chữ ký mới',
        content: bothSigned
          ? `Hai bên đã ký xong hợp đồng cho "${rental.asset.title}".`
          : `${currentUser.fullName} đã ký hợp đồng cho đơn thuê "${rental.asset.title}".`,
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );

    return updated;
  }

  async startHandover(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: StartHandoverDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);

    if (dto.type === HandoverType.DELIVERY) {
      this.assertOwner(rental.ownerId, currentUser);
      this.assertStatus(rental.status, [RentalStatus.CONFIRMED, RentalStatus.READY_FOR_HANDOVER]);
    } else {
      this.assertOwner(rental.ownerId, currentUser);
      this.assertStatus(rental.status, [RentalStatus.RETURN_PENDING]);
    }

    const handover = await this.prisma.$transaction(async (tx) => {
      const created = await tx.handover.create({
        data: {
          rentalId: rental.id,
          type: dto.type,
          status: HandoverStatus.PENDING,
          notes: dto.notes,
          items: dto.items?.length
            ? {
                create: dto.items.map((item) => ({
                  accessoryName: item.accessoryName,
                  expectedQuantity: item.expectedQuantity,
                  actualQuantity: item.actualQuantity,
                  condition: item.condition,
                  note: item.note,
                })),
              }
            : undefined,
        },
        include: {
          items: true,
          evidences: true,
        },
      });

      if (dto.evidences?.length) {
        await tx.evidence.createMany({
          data: dto.evidences.map((evidence) => ({
            rentalId: rental.id,
            handoverId: created.id,
            uploadedBy: currentUser.id,
            type: evidence.type,
            fileUrl: evidence.fileUrl,
            fileKey: evidence.fileKey,
            metadata: evidence.metadata as Prisma.InputJsonValue | undefined,
            fileHash: evidence.fileHash,
          })),
        });
      }

      await tx.rentalRequest.update({
        where: { id: rental.id },
        data: {
          status:
            dto.type === HandoverType.DELIVERY
              ? RentalStatus.READY_FOR_HANDOVER
              : RentalStatus.RETURN_PENDING,
        },
      });
      return tx.handover.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          items: true,
          evidences: true,
        },
      });
    });

    return handover;
  }

  async confirmHandover(
    rentalId: string,
    handoverId: string,
    currentUser: AuthenticatedUser,
    dto: ConfirmHandoverDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    const handover = await this.prisma.handover.findUnique({
      where: { id: handoverId },
    });

    if (!handover || handover.rentalId !== rental.id) {
      throw new NotFoundException('Handover session not found');
    }

    if (handover.type === HandoverType.DELIVERY) {
      this.assertRenter(rental.renterId, currentUser);
    } else {
      this.assertOwner(rental.ownerId, currentUser);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.handover.update({
        where: { id: handover.id },
        data: {
          status: HandoverStatus.CONFIRMED,
          confirmedAt: new Date(),
          notes: dto.notes ?? handover.notes,
        },
      });

      if (handover.type === HandoverType.DELIVERY) {
        return tx.rentalRequest.update({
          where: { id: rental.id },
          data: { status: RentalStatus.ONGOING },
          include: this.rentalInclude(),
        });
      }

      const payout = rental.payout;
      if (payout) {
        await tx.payout.update({
          where: { id: payout.id },
          data: {
            status: PayoutStatus.PAID,
            paidAt: new Date(),
          },
        });
      }

      return tx.rentalRequest.update({
        where: { id: rental.id },
        data: { status: RentalStatus.COMPLETED },
        include: this.rentalInclude(),
      });
    });

    await this.notificationsService.createMany(
      [rental.ownerId, rental.renterId].filter((userId) => userId !== currentUser.id),
      {
        type:
          handover.type === HandoverType.DELIVERY
            ? NotificationType.HANDOVER_COMPLETED
            : NotificationType.RETURN_COMPLETED,
        title:
          handover.type === HandoverType.DELIVERY
            ? 'Bàn giao hoàn tất'
            : 'Hoàn trả hoàn tất',
        content:
          handover.type === HandoverType.DELIVERY
            ? `Tài sản "${rental.asset.title}" đã được bàn giao thành công.`
            : `Đơn thuê "${rental.asset.title}" đã hoàn tất hoàn trả.`,
        referenceType: 'rental',
        referenceId: rental.id,
      },
    );

    return updated;
  }

  async requestReturn(rentalId: string, currentUser: AuthenticatedUser) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    this.assertRenter(rental.renterId, currentUser);
    this.assertStatus(rental.status, [RentalStatus.ONGOING, RentalStatus.OVERDUE]);

    const updated = await this.prisma.rentalRequest.update({
      where: { id: rental.id },
      data: {
        status: RentalStatus.RETURN_PENDING,
      },
      include: this.rentalInclude(),
    });

    await this.notificationsService.createMany([rental.ownerId], {
      type: NotificationType.RETURN_REQUESTED,
      title: 'Người thuê yêu cầu hoàn trả',
      content: `Người thuê đã yêu cầu hoàn trả tài sản "${rental.asset.title}".`,
      referenceType: 'rental',
      referenceId: rental.id,
    });

    return updated;
  }

  async reportIssue(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: ReportIssueDto,
  ) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    this.assertOwner(rental.ownerId, currentUser);
    this.assertStatus(rental.status, [RentalStatus.RETURN_PENDING]);

    const existing = await this.prisma.dispute.findFirst({
      where: {
        rentalId: rental.id,
        status: {
          in: [
            DisputeStatus.OPEN,
            DisputeStatus.WAITING_RESPONSE,
            DisputeStatus.UNDER_REVIEW,
          ],
        },
      },
    });

    if (existing) {
      throw new ConflictException('This rental already has an active dispute');
    }

    const dispute = await this.prisma.$transaction(async (tx) => {
      await tx.rentalRequest.update({
        where: { id: rental.id },
        data: {
          status: RentalStatus.DISPUTED,
          message: dto.description,
        },
      });

      return tx.dispute.create({
        data: {
          rentalId: rental.id,
          openedById: currentUser.id,
          reason: 'RETURN_ISSUE',
          description: dto.description,
          status: DisputeStatus.OPEN,
          events: {
            create: {
              actorId: currentUser.id,
              eventType: DisputeEventType.OPENED,
              content: dto.description,
              metadata: {
                source: 'rentals.reportIssue',
              },
            },
          },
        },
      });
    });

    await this.notificationsService.createMany([rental.renterId], {
      type: NotificationType.SYSTEM,
      title: 'Đơn thuê đang có vấn đề cần xử lý',
      content: `Chủ tài sản đã báo cáo vấn đề với đơn thuê "${rental.asset.title}".`,
      referenceType: 'dispute',
      referenceId: dispute.id,
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'dispute.create.from-rental',
      entityType: 'dispute',
      entityId: dispute.id,
      afterData: {
        rentalId: rental.id,
        reason: 'RETURN_ISSUE',
      },
    });

    return this.prisma.dispute.findUniqueOrThrow({
      where: { id: dispute.id },
      include: {
        openedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        events: {
          orderBy: [{ createdAt: 'asc' }],
        },
      },
    });
  }

  async listReviewsForRental(rentalId: string, currentUser: AuthenticatedUser) {
    const rental = await this.findAccessibleRental(rentalId, currentUser);
    return this.prisma.review.findMany({
      where: {
        rentalId: rental.id,
      },
      orderBy: [{ createdAt: 'asc' }],
    });
  }

  private async findAccessibleRental(rentalId: string, currentUser: AuthenticatedUser) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: this.rentalInclude(),
    });

    if (!rental) {
      throw new NotFoundException('Rental request not found');
    }

    const canAccess =
      rental.ownerId === currentUser.id ||
      rental.renterId === currentUser.id ||
      this.isStaff(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this rental');
    }

    return rental;
  }

  private assertOwner(ownerId: string, currentUser: AuthenticatedUser) {
    if (ownerId !== currentUser.id && !this.isStaff(currentUser)) {
      throw new ForbiddenException('Only the owner can perform this action');
    }
  }

  private assertRenter(renterId: string, currentUser: AuthenticatedUser) {
    if (renterId !== currentUser.id && !this.isStaff(currentUser)) {
      throw new ForbiddenException('Only the renter can perform this action');
    }
  }

  private assertVerifiedUser(currentUser: AuthenticatedUser) {
    if (currentUser.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Only verified users can create rental requests',
      );
    }
  }

  private assertStatus(current: RentalStatus, allowed: RentalStatus[]) {
    if (!allowed.includes(current)) {
      throw new ConflictException(
        `Rental is in status ${current} and cannot perform this action`,
      );
    }
  }

  private async ensureNoOverlap(assetId: string, startAt: Date, endAt: Date) {
    const overlapping = await this.prisma.rentalRequest.findFirst({
      where: {
        assetId,
        status: {
          in: [
            RentalStatus.AWAITING_SIGNATURE,
            RentalStatus.CONFIRMED,
            RentalStatus.READY_FOR_HANDOVER,
            RentalStatus.ONGOING,
            RentalStatus.RETURN_PENDING,
            RentalStatus.OVERDUE,
          ],
        },
        startAt: {
          lt: endAt,
        },
        endAt: {
          gt: startAt,
        },
      },
    });

    if (overlapping) {
      throw new ConflictException('This asset already has an overlapping booking');
    }
  }

  private async computePricing(pricePerDay: number, durationInDays: number) {
    const rentalFee = pricePerDay * durationInDays;
    const platformFeePercent = await this.getNumericConfig('platform_fee_percent', 5);
    const serviceFee = Math.round((rentalFee * platformFeePercent) / 100);

    return {
      rentalFee,
      serviceFee,
      deliveryFee: 0,
      totalAmount: rentalFee + serviceFee,
    };
  }

  private async getOwnerCommissionAmount(rentalFee: number) {
    const ownerCommissionPercent = await this.getNumericConfig(
      'owner_commission_percent',
      10,
    );
    return Math.round((rentalFee * ownerCommissionPercent) / 100);
  }

  private async getNumericConfig(key: string, fallback: number) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });
    return config ? Number(config.value) : fallback;
  }

  private async generateContractNumber() {
    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(now.getUTCDate()).padStart(2, '0');
    const prefix = `TS-${yyyy}${mm}${dd}`;

    const count = await this.prisma.rentalContract.count({
      where: {
        contractNumber: {
          startsWith: prefix,
        },
      },
    });

    return `${prefix}-${String(count + 1).padStart(4, '0')}`;
  }

  private buildContractSnapshot(
    rental: Awaited<ReturnType<RentalsService['findAccessibleRental']>>,
  ) {
    return {
      owner: {
        id: rental.owner.id,
        fullName: rental.owner.fullName,
      },
      renter: {
        id: rental.renter.id,
        fullName: rental.renter.fullName,
      },
      asset: {
        id: rental.asset.id,
        title: rental.asset.title,
        serialNumber: rental.asset.serialNumber,
        pricePerDay: rental.asset.pricePerDay,
      },
      rental: {
        startAt: rental.startAt.toISOString(),
        endAt: rental.endAt.toISOString(),
        rentalFee: rental.rentalFee,
        serviceFee: rental.serviceFee,
        deliveryFee: rental.deliveryFee,
        totalAmount: rental.totalAmount,
      },
    };
  }

  private rentalInclude() {
    return {
      asset: {
        include: {
          images: {
            orderBy: [{ sortOrder: 'asc' as const }],
          },
        },
      },
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
      contract: {
        include: {
          signatures: true,
        },
      },
      payments: true,
      payout: true,
      handovers: {
        include: {
          items: true,
          evidences: true,
        },
      },
      reviews: {
        where: {
          status: ReviewStatus.PUBLISHED,
        },
      },
    } satisfies Prisma.RentalRequestInclude;
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
