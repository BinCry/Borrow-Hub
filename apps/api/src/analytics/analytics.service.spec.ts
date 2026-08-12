import { AnalyticsEventType } from '@prisma/client';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  const prisma = {
    analyticsEvent: {
      create: jest.fn(),
      count: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: AnalyticsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AnalyticsService(prisma as never);
  });

  it('tracks a new analytics event', async () => {
    prisma.analyticsEvent.create.mockResolvedValue({
      id: 'event-1',
      eventType: AnalyticsEventType.USER_REGISTERED,
    });

    const result = await service.track({
      eventType: AnalyticsEventType.USER_REGISTERED,
      userId: 'user-1',
      entityType: 'user',
      entityId: 'user-1',
    });

    expect(prisma.analyticsEvent.create).toHaveBeenCalledWith({
      data: {
        eventType: AnalyticsEventType.USER_REGISTERED,
        userId: 'user-1',
        entityType: 'user',
        entityId: 'user-1',
        metadata: undefined,
      },
    });
    expect(result.id).toBe('event-1');
  });

  it('returns funnel counts for summary', async () => {
    prisma.analyticsEvent.count.mockResolvedValue(2);
    prisma.analyticsEvent.findMany.mockResolvedValue([
      {
        id: 'event-2',
        eventType: AnalyticsEventType.RENTAL_REQUEST_CREATED,
      },
    ]);

    const result = await service.summary({
      startDate: '2026-08-01T00:00:00.000Z',
      endDate: '2026-08-12T23:59:59.999Z',
    });

    expect(prisma.analyticsEvent.count).toHaveBeenCalled();
    expect(result.total).toBeGreaterThan(0);
    expect(result.funnel).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventType: AnalyticsEventType.USER_REGISTERED,
          count: 2,
        }),
      ]),
    );
  });
});
