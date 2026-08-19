import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  PaymentStatus,
  PayoutStatus,
  Prisma,
  RefundStatus,
  RoleName,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateRefundDto,
  PaymentQueryDto,
  PayoutQueryDto,
  RefundQueryDto,
  UpdatePayoutStatusDto,
  UpdateRefundStatusDto,
} from './finance.dto';

const REFUNDABLE_PAYMENT_STATUSES: PaymentStatus[] = [
  PaymentStatus.SUCCESS,
  PaymentStatus.PARTIALLY_REFUNDED,
];
const RESERVED_REFUND_STATUSES: RefundStatus[] = [
  RefundStatus.PENDING,
  RefundStatus.COMPLETED,
];

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listMyPayments(currentUser: AuthenticatedUser, query: PaymentQueryDto) {
    const where: Prisma.PaymentWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...this.buildPaymentScope(currentUser, query.role),
    };

    return this.prisma.payment.findMany({
      where,
      include: this.paymentInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getPayment(paymentId: string, currentUser: AuthenticatedUser) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: this.paymentInclude(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    this.assertPaymentAccess(payment, currentUser);
    return payment;
  }

  async listRefunds(
    paymentId: string,
    currentUser: AuthenticatedUser,
    query: RefundQueryDto,
  ) {
    const payment = await this.getPayment(paymentId, currentUser);

    return this.prisma.refund.findMany({
      where: {
        paymentId: payment.id,
        ...(query.status ? { status: query.status } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async createRefund(
    paymentId: string,
    currentUser: AuthenticatedUser,
    dto: CreateRefundDto,
  ) {
    this.assertFinanceManager(currentUser);

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: this.paymentInclude(),
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    if (
      !REFUNDABLE_PAYMENT_STATUSES.includes(
        payment.status,
      )
    ) {
      throw new BadRequestException('Only settled payments can be refunded');
    }

    const totalRefunded = payment.refunds
      .filter((refund) =>
        RESERVED_REFUND_STATUSES.includes(refund.status),
      )
      .reduce((sum, refund) => sum + refund.amount, 0);
    const remainingAmount = payment.amount - totalRefunded;

    if (dto.amount > remainingAmount) {
      throw new BadRequestException('Refund amount exceeds refundable balance');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "payments" WHERE id = ${payment.id} FOR UPDATE`;
      const lockedPayment = await tx.payment.findUnique({
        where: { id: payment.id },
        select: {
          amount: true,
          status: true,
          refunds: {
            select: { amount: true, status: true },
          },
        },
      });

      if (
        !lockedPayment ||
        !REFUNDABLE_PAYMENT_STATUSES.includes(
          lockedPayment.status,
        )
      ) {
        throw new BadRequestException('Payment is no longer refundable');
      }

      const reservedAmount = lockedPayment.refunds
        .filter((refund) =>
          RESERVED_REFUND_STATUSES.includes(refund.status),
        )
        .reduce((sum, refund) => sum + refund.amount, 0);

      if (dto.amount > lockedPayment.amount - reservedAmount) {
        throw new BadRequestException('Refund amount exceeds refundable balance');
      }

      const refund = await tx.refund.create({
        data: {
          paymentId: payment.id,
          amount: dto.amount,
          reason: dto.reason,
          status: RefundStatus.PENDING,
        },
      });

      if (payment.rental.payout) {
        await tx.payout.update({
          where: { id: payment.rental.payout.id },
          data: {
            status: PayoutStatus.BLOCKED,
          },
        });
      }

      return refund;
    });

    await this.notificationsService.createMany(
      [payment.payerId, payment.rental.ownerId].filter(
        (userId) => userId !== currentUser.id,
      ),
      {
        type: NotificationType.SYSTEM,
        title: 'Yêu cầu hoàn tiền đã được ghi nhận',
        content: `Khoản hoàn ${dto.amount} ${payment.currency} cho đơn "${payment.rental.asset.title}" đang được xử lý.`,
        referenceType: 'payment',
        referenceId: payment.id,
      },
    );

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'finance.refund.create',
      entityType: 'refund',
      entityId: result.id,
      afterData: {
        paymentId: payment.id,
        amount: dto.amount,
        status: RefundStatus.PENDING,
      },
    });

    return this.prisma.payment.findUniqueOrThrow({
      where: { id: payment.id },
      include: this.paymentInclude(),
    });
  }

  async updateRefundStatus(
    refundId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateRefundStatusDto,
  ) {
    this.assertFinanceManager(currentUser);

    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "refunds" WHERE id = ${refundId} FOR UPDATE`;
      const refund = await tx.refund.findUnique({
        where: { id: refundId },
        include: {
          payment: {
            include: {
              refunds: true,
              rental: {
                include: {
                  asset: true,
                  payout: true,
                },
              },
            },
          },
        },
      });

      if (!refund) {
        throw new NotFoundException('Refund not found');
      }

      if (refund.status !== RefundStatus.PENDING) {
        throw new BadRequestException('Only pending refunds can be updated');
      }

      const updated = await tx.refund.update({
        where: { id: refund.id },
        data: {
          status: dto.status,
          completedAt:
            dto.status === RefundStatus.COMPLETED ? new Date() : null,
        },
      });

      if (dto.status === RefundStatus.COMPLETED) {
        const completedAmount = refund.payment.refunds
          .filter(
            (item) =>
              item.id !== refund.id && item.status === RefundStatus.COMPLETED,
          )
          .reduce((sum, item) => sum + item.amount, refund.amount);
        const paymentStatus =
          completedAmount >= refund.payment.amount
            ? PaymentStatus.REFUNDED
            : PaymentStatus.PARTIALLY_REFUNDED;

        await tx.payment.update({
          where: { id: refund.paymentId },
          data: { status: paymentStatus },
        });

        if (refund.payment.rental.payout) {
          await tx.payout.update({
            where: { id: refund.payment.rental.payout.id },
            data: {
              status:
                paymentStatus === PaymentStatus.REFUNDED
                  ? PayoutStatus.CANCELLED
                  : PayoutStatus.BLOCKED,
            },
          });
        }
      } else if (refund.payment.rental.payout) {
        const otherPendingOrCompleted = refund.payment.refunds.some(
          (item) =>
            item.id !== refund.id &&
            RESERVED_REFUND_STATUSES.includes(item.status),
        );
        if (!otherPendingOrCompleted) {
          await tx.payout.update({
            where: { id: refund.payment.rental.payout.id },
            data: { status: PayoutStatus.PENDING },
          });
        }
      }

      return { updated, payment: refund.payment };
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'finance.refund.status.update',
      entityType: 'refund',
      entityId: result.updated.id,
      beforeData: { status: RefundStatus.PENDING },
      afterData: { status: result.updated.status },
    });

    if (dto.status === RefundStatus.COMPLETED) {
      await this.notificationsService.createMany(
        [result.payment.payerId, result.payment.rental.ownerId].filter(
          (userId) => userId !== currentUser.id,
        ),
        {
          type: NotificationType.SYSTEM,
          title: 'Hoàn tiền đã hoàn tất',
          content: `Khoản hoàn ${result.updated.amount} ${result.payment.currency} cho đơn "${result.payment.rental.asset.title}" đã hoàn tất.`,
          referenceType: 'payment',
          referenceId: result.payment.id,
        },
      );
    }

    return this.prisma.payment.findUniqueOrThrow({
      where: { id: result.payment.id },
      include: this.paymentInclude(),
    });
  }

  listMyPayouts(currentUser: AuthenticatedUser, query: PayoutQueryDto) {
    return this.prisma.payout.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(this.isStaff(currentUser)
          ? {}
          : {
              ownerId: currentUser.id,
            }),
      },
      include: this.payoutInclude(),
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getPayout(payoutId: string, currentUser: AuthenticatedUser) {
    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: this.payoutInclude(),
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    if (payout.ownerId !== currentUser.id && !this.isStaff(currentUser)) {
      throw new ForbiddenException('You cannot access this payout');
    }

    return payout;
  }

  async updatePayoutStatus(
    payoutId: string,
    currentUser: AuthenticatedUser,
    dto: UpdatePayoutStatusDto,
  ) {
    this.assertFinanceManager(currentUser);

    const payout = await this.prisma.payout.findUnique({
      where: { id: payoutId },
      include: this.payoutInclude(),
    });

    if (!payout) {
      throw new NotFoundException('Payout not found');
    }

    const updated = await this.prisma.payout.update({
      where: { id: payout.id },
      data: {
        status: dto.status,
        paidAt: dto.status === PayoutStatus.PAID ? new Date() : payout.paidAt,
      },
      include: this.payoutInclude(),
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'finance.payout.status.update',
      entityType: 'payout',
      entityId: payout.id,
      beforeData: { status: payout.status },
      afterData: { status: updated.status, paidAt: updated.paidAt },
    });

    if (
      updated.status === PayoutStatus.PAID &&
      payout.status !== PayoutStatus.PAID
    ) {
      await this.notificationsService.createMany([payout.ownerId], {
        type: NotificationType.PAYOUT_COMPLETED,
        title: 'Payout đã hoàn tất',
        content: `Payout cho đơn "${updated.rental.asset.title}" đã được ghi nhận thành công.`,
        referenceType: 'payout',
        referenceId: updated.id,
      });
    }

    return updated;
  }

  private buildPaymentScope(
    currentUser: AuthenticatedUser,
    role: PaymentQueryDto['role'],
  ): Prisma.PaymentWhereInput {
    if (role === 'payer') {
      return { payerId: currentUser.id };
    }

    if (role === 'owner') {
      return {
        rental: {
          ownerId: currentUser.id,
        },
      };
    }

    if (this.isStaff(currentUser) && role === 'all') {
      return {};
    }

    return {
      OR: [
        { payerId: currentUser.id },
        { rental: { ownerId: currentUser.id } },
      ],
    };
  }

  private assertPaymentAccess(
    payment: Awaited<ReturnType<FinanceService['getPayment']>>,
    currentUser: AuthenticatedUser,
  ) {
    const canAccess =
      payment.payerId === currentUser.id ||
      payment.rental.ownerId === currentUser.id ||
      this.isFinanceViewer(currentUser);

    if (!canAccess) {
      throw new ForbiddenException('You cannot access this payment');
    }
  }

  private paymentInclude() {
    return {
      payer: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      refunds: true,
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
          payout: true,
        },
      },
    } satisfies Prisma.PaymentInclude;
  }

  private payoutInclude() {
    return {
      owner: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      rental: {
        include: {
          asset: true,
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          payments: {
            include: {
              refunds: true,
            },
          },
        },
      },
    } satisfies Prisma.PayoutInclude;
  }

  private assertFinanceManager(currentUser: AuthenticatedUser) {
    if (!currentUser.roles.some((role) => this.financeManagerRoles().includes(role))) {
      throw new ForbiddenException('Only finance managers can perform this action');
    }
  }

  private isFinanceViewer(currentUser: AuthenticatedUser) {
    const viewerRoles: RoleName[] = [
      RoleName.CUSTOMER_SUPPORT,
      RoleName.DISPUTE_OFFICER,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];

    return currentUser.roles.some((role) => viewerRoles.includes(role));
  }

  private financeManagerRoles(): RoleName[] {
    return [
      RoleName.DISPUTE_OFFICER,
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
