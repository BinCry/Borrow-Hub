import { Injectable } from '@nestjs/common';
import { AnalyticsEventType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsEventsQueryDto, AnalyticsSummaryQueryDto } from './analytics.dto';

type TrackAnalyticsEventInput = {
  eventType: AnalyticsEventType;
  userId?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  metadata?: Prisma.InputJsonValue;
};

const ANALYTICS_FUNNEL: AnalyticsEventType[] = [
  AnalyticsEventType.USER_REGISTERED,
  AnalyticsEventType.KYC_STARTED,
  AnalyticsEventType.KYC_COMPLETED,
  AnalyticsEventType.SEARCH_PERFORMED,
  AnalyticsEventType.LISTING_VIEWED,
  AnalyticsEventType.RENTAL_REQUEST_CREATED,
  AnalyticsEventType.RENTAL_APPROVED,
  AnalyticsEventType.PAYMENT_COMPLETED,
  AnalyticsEventType.CONTRACT_SIGNED,
  AnalyticsEventType.HANDOVER_COMPLETED,
  AnalyticsEventType.RETURN_COMPLETED,
  AnalyticsEventType.REVIEW_CREATED,
  AnalyticsEventType.DISPUTE_OPENED,
];

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  track(input: TrackAnalyticsEventInput) {
    return this.prisma.analyticsEvent.create({
      data: {
        eventType: input.eventType,
        userId: input.userId ?? null,
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: input.metadata,
      },
    });
  }

  list(query: AnalyticsEventsQueryDto) {
    const where = this.buildWhere(query);

    return this.prisma.analyticsEvent.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: query.limit ?? 100,
    });
  }

  async summary(query: AnalyticsSummaryQueryDto) {
    const where = this.buildWhere(query);

    const counts = await Promise.all(
      ANALYTICS_FUNNEL.map(async (eventType) => ({
        eventType,
        count: await this.prisma.analyticsEvent.count({
          where: {
            ...where,
            eventType,
          },
        }),
      })),
    );

    const total = counts.reduce((sum, entry) => sum + entry.count, 0);
    const latestEvents = await this.prisma.analyticsEvent.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      take: 10,
    });

    return {
      dateRange: {
        startDate: query.startDate ?? null,
        endDate: query.endDate ?? null,
      },
      total,
      funnel: counts,
      latestEvents,
    };
  }

  private buildWhere(
    query: Pick<
      AnalyticsEventsQueryDto,
      'eventType' | 'userId' | 'entityType' | 'entityId' | 'startDate' | 'endDate'
    >,
  ): Prisma.AnalyticsEventWhereInput {
    return {
      ...(query.eventType ? { eventType: query.eventType } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.entityType ? { entityType: query.entityType } : {}),
      ...(query.entityId ? { entityId: query.entityId } : {}),
      ...((query.startDate || query.endDate)
        ? {
            createdAt: {
              ...(query.startDate ? { gte: new Date(query.startDate) } : {}),
              ...(query.endDate ? { lte: new Date(query.endDate) } : {}),
            },
          }
        : {}),
    };
  }
}
