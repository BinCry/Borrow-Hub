import { ForbiddenException, Injectable } from '@nestjs/common';
import { NotificationType, Prisma, RentalStatus } from '@prisma/client';
import { ChatTimelineService } from '../chat/chat-timeline.service';
import { PrismaService } from '../database/prisma.service';
import { RunReminderJobsDto } from './notifications.dto';

type NotificationMetadata = Record<string, string | number | boolean | null>;

type NotificationPayload = {
  type: NotificationType;
  title: string;
  content: string;
  metadata?: NotificationMetadata;
  referenceType?: string;
  referenceId?: string;
};

type NotificationRecord = Prisma.NotificationGetPayload<Record<string, never>>;

@Injectable()
export class NotificationsService {
  private static readonly HOUR_IN_MS = 60 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly chatTimelineService: ChatTimelineService,
  ) {}

  async createMany(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    const normalizedPayload = this.normalizePayload(payload);

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        ...normalizedPayload,
        metadata: normalizedPayload.metadata as Prisma.InputJsonValue | undefined,
      })),
    });
  }

  async createManyUnique(
    userIds: string[],
    payload: NotificationPayload,
    dedupeWindowStart: Date,
  ): Promise<number> {
    let createdCount = 0;
    const normalizedPayload = this.normalizePayload(payload);

    for (const userId of [...new Set(userIds)]) {
      const existing = await this.prisma.notification.findFirst({
        where: {
          userId,
          type: normalizedPayload.type,
          referenceType: normalizedPayload.referenceType ?? null,
          referenceId: normalizedPayload.referenceId ?? null,
          createdAt: {
            gte: dedupeWindowStart,
          },
        },
      });

      if (existing) {
        continue;
      }

      await this.prisma.notification.create({
        data: {
          userId,
          ...normalizedPayload,
          metadata:
            normalizedPayload.metadata as Prisma.InputJsonValue | undefined,
        },
      });
      createdCount += 1;
    }

    return createdCount;
  }

  async findForUser(userId: string) {
    const notifications = await this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return notifications.map((notification) =>
      this.serializeNotification(notification),
    );
  }

  async markAsRead(userId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException('Notification not found');
    }

    const updated = await this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });

    return this.serializeNotification(updated);
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }

  async runReminderJobs(dto: RunReminderJobsDto) {
    const referenceDate = dto.referenceDate
      ? new Date(dto.referenceDate)
      : new Date();
    const next24Hours = new Date(referenceDate.getTime() + 24 * 60 * 60 * 1000);
    const dedupeWindowStart = new Date(
      referenceDate.getTime() - 24 * 60 * 60 * 1000,
    );
    const lateFeeRate = await this.getNumericConfig('late_fee_rate', 0);

    const [
      rentalsTomorrow,
      returnReminders,
      overdueRentals,
      completedRentals,
      weekendFavorites,
    ] = await Promise.all([
      this.prisma.rentalRequest.findMany({
        where: {
          status: {
            in: [RentalStatus.CONFIRMED, RentalStatus.READY_FOR_HANDOVER],
          },
          startAt: {
            gte: referenceDate,
            lt: next24Hours,
          },
        },
        include: {
          asset: true,
        },
      }),
      this.prisma.rentalRequest.findMany({
        where: {
          status: RentalStatus.ONGOING,
          endAt: {
            gte: referenceDate,
            lt: next24Hours,
          },
        },
        include: {
          asset: true,
        },
      }),
      this.prisma.rentalRequest.findMany({
        where: {
          status: {
            in: [RentalStatus.ONGOING, RentalStatus.RETURN_PENDING],
          },
          endAt: {
            lt: referenceDate,
          },
        },
        include: {
          asset: true,
        },
      }),
      this.prisma.rentalRequest.findMany({
        where: {
          status: RentalStatus.COMPLETED,
          updatedAt: {
            gte: new Date(referenceDate.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          asset: true,
          reviews: true,
        },
      }),
      this.prisma.favoriteAsset.findMany({
        where: {
          asset: {
            status: 'ACTIVE',
          },
        },
        include: {
          asset: {
            include: {
              rentalRequests: true,
            },
          },
          user: true,
        },
      }),
    ]);

    let rentalTomorrowCount = 0;
    for (const rental of rentalsTomorrow) {
      const createdCount = await this.createManyUnique(
        [rental.ownerId, rental.renterId],
        {
          type: NotificationType.RENTAL_TOMORROW,
          title: 'Đơn thuê sắp bắt đầu',
          content: `Đơn thuê "${rental.asset.title}" sẽ bắt đầu trong vòng 24 giờ tới.`,
          metadata: {
            rentalId: rental.id,
            assetId: rental.assetId,
          },
          referenceType: 'rental',
          referenceId: rental.id,
        },
        dedupeWindowStart,
      );

      rentalTomorrowCount += createdCount;

      if (createdCount > 0) {
        await this.chatTimelineService.appendSystemMessageForRental(
          rental.id,
          rental.ownerId,
          'Rental begins tomorrow.',
          {
            dedupeWindowStart,
            metadata: {
              source: 'reminder_job',
              reminderType: NotificationType.RENTAL_TOMORROW,
            },
          },
        );
      }
    }

    let returnReminderCount = 0;
    for (const rental of returnReminders) {
      returnReminderCount += await this.createManyUnique(
        [rental.ownerId, rental.renterId],
        {
          type: NotificationType.RETURN_REMINDER,
          title: 'Nhắc nhở hoàn trả',
          content: `Đơn thuê "${rental.asset.title}" sắp đến hạn hoàn trả trong vòng 24 giờ tới.`,
          metadata: {
            rentalId: rental.id,
            assetId: rental.assetId,
          },
          referenceType: 'rental',
          referenceId: rental.id,
        },
        dedupeWindowStart,
      );
    }

    let overdueCount = 0;
    for (const rental of overdueRentals) {
      const lateFee = this.calculateLateFee(
        rental.endAt,
        referenceDate,
        lateFeeRate,
      );

      if (rental.status !== RentalStatus.OVERDUE || rental.lateFee !== lateFee) {
        await this.prisma.rentalRequest.update({
          where: { id: rental.id },
          data: {
            status: RentalStatus.OVERDUE,
            lateFee,
          },
        });
      }

      overdueCount += await this.createManyUnique(
        [rental.ownerId, rental.renterId],
        {
          type: NotificationType.RENTAL_OVERDUE,
          title: 'Đơn thuê đã quá hạn',
          content: this.buildOverdueContent(rental.asset.title, lateFee),
          metadata: {
            rentalId: rental.id,
            assetId: rental.assetId,
          },
          referenceType: 'rental',
          referenceId: rental.id,
        },
        dedupeWindowStart,
      );
    }

    let reviewReminderCount = 0;
    for (const rental of completedRentals) {
      const reviewerIds = new Set(rental.reviews.map((review) => review.reviewerId));
      const missingReviewUsers = [rental.ownerId, rental.renterId].filter(
        (userId) => !reviewerIds.has(userId),
      );

      if (missingReviewUsers.length === 0) {
        continue;
      }

      reviewReminderCount += await this.createManyUnique(
        missingReviewUsers,
        {
          type: NotificationType.REVIEW_REMINDER,
          title: 'Nhắc nhở đánh giá giao dịch',
          content: `Bạn vẫn chưa để lại đánh giá cho giao dịch "${rental.asset.title}".`,
          metadata: {
            rentalId: rental.id,
            assetId: rental.assetId,
          },
          referenceType: 'rental',
          referenceId: rental.id,
        },
        dedupeWindowStart,
      );
    }

    const weekendWindow = this.getUpcomingWeekendWindow(referenceDate);
    let availabilityMatchCount = 0;
    const activeWeekendStatuses: RentalStatus[] = [
      RentalStatus.CONFIRMED,
      RentalStatus.READY_FOR_HANDOVER,
      RentalStatus.ONGOING,
    ];
    for (const favorite of weekendFavorites) {
      const hasWeekendBooking = favorite.asset.rentalRequests.some((rental) =>
        activeWeekendStatuses.includes(rental.status) &&
        rental.startAt < weekendWindow.end &&
        rental.endAt > weekendWindow.start,
      );

      if (hasWeekendBooking) {
        continue;
      }

      availabilityMatchCount += await this.createManyUnique(
        [favorite.userId],
        {
          type: NotificationType.AVAILABILITY_MATCH,
          title: 'Tài sản yêu thích đang rảnh cuối tuần',
          content: `Tài sản "${favorite.asset.title}" trong wishlist của bạn hiện có vẻ đang rảnh vào cuối tuần tới.`,
          metadata: {
            assetId: favorite.assetId,
          },
          referenceType: 'asset',
          referenceId: favorite.assetId,
        },
        dedupeWindowStart,
      );
    }

    return {
      referenceDate: referenceDate.toISOString(),
      rentalTomorrowCount,
      returnReminderCount,
      overdueCount,
      reviewReminderCount,
      availabilityMatchCount,
    };
  }

  private getUpcomingWeekendWindow(referenceDate: Date) {
    const day = referenceDate.getDay();
    const daysUntilSaturday = (6 - day + 7) % 7;
    const saturday = new Date(referenceDate);
    saturday.setHours(0, 0, 0, 0);
    saturday.setDate(saturday.getDate() + daysUntilSaturday);

    const monday = new Date(saturday);
    monday.setDate(monday.getDate() + 2);

    return {
      start: saturday,
      end: monday,
    };
  }

  private async getNumericConfig(key: string, fallback: number) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    return config ? Number(config.value) : fallback;
  }

  private calculateLateFee(
    endAt: Date,
    referenceDate: Date,
    lateFeeRate: number,
  ) {
    if (lateFeeRate <= 0) {
      return 0;
    }

    const overdueHours = Math.max(
      1,
      Math.ceil(
        (referenceDate.getTime() - endAt.getTime()) /
          NotificationsService.HOUR_IN_MS,
      ),
    );

    return overdueHours * lateFeeRate;
  }

  private buildOverdueContent(assetTitle: string, lateFee: number) {
    if (lateFee <= 0) {
      return `Đơn thuê "${assetTitle}" hiện đang quá hạn.`;
    }

    return `Đơn thuê "${assetTitle}" hiện đang quá hạn. Phí trễ tạm tính hiện tại là ${lateFee} VND.`;
  }
  private normalizePayload(payload: NotificationPayload) {
    const defaultMetadata =
      payload.referenceType && payload.referenceId
        ? this.buildReferenceMetadata(payload.referenceType, payload.referenceId)
        : undefined;

    return {
      ...payload,
      metadata: this.mergeMetadata(defaultMetadata, payload.metadata),
    };
  }

  private buildReferenceMetadata(
    referenceType: string,
    referenceId: string,
  ): NotificationMetadata | undefined {
    const metadataKeyByReferenceType: Record<string, string> = {
      asset: 'assetId',
      rental: 'rentalId',
      conversation: 'conversationId',
      dispute: 'disputeId',
      payment: 'paymentId',
      payout: 'payoutId',
      report: 'reportId',
      support_ticket: 'supportTicketId',
      risk: 'riskIncidentId',
      kyc: 'kycId',
    };
    const metadataKey = metadataKeyByReferenceType[referenceType];

    if (!metadataKey) {
      return undefined;
    }

    return {
      [metadataKey]: referenceId,
    };
  }

  private mergeMetadata(
    ...sources: Array<NotificationMetadata | undefined>
  ): NotificationMetadata | undefined {
    const mergedEntries = sources
      .filter((source): source is NotificationMetadata => !!source)
      .flatMap((source) =>
        Object.entries(source).filter(([, value]) => value !== undefined),
      );

    if (mergedEntries.length === 0) {
      return undefined;
    }

    return Object.fromEntries(mergedEntries);
  }

  private serializeNotification(notification: NotificationRecord) {
    const metadata =
      notification.metadata &&
      typeof notification.metadata === 'object' &&
      !Array.isArray(notification.metadata)
        ? (notification.metadata as NotificationMetadata)
        : this.buildReferenceMetadata(
            notification.referenceType ?? '',
            notification.referenceId ?? '',
          );

    return {
      ...notification,
      body: notification.content,
      metadata: metadata ?? null,
    };
  }
}
