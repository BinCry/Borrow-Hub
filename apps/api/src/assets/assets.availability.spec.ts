import { AssetStatus, AvailabilityType } from '@prisma/client';
import { AssetsService } from './assets.service';

describe('AssetsService availability filters', () => {
  const prisma = {
    asset: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const analyticsService = {
    track: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const riskService = {
    assessAssetSubmission: jest.fn(),
  };

  let service: AssetsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.asset.findMany.mockReturnValue('find-many-query');
    prisma.asset.count.mockReturnValue('count-query');
    prisma.$transaction.mockResolvedValue([
      [
        {
          id: 'asset-1',
          title: 'Canon R6',
          status: AssetStatus.ACTIVE,
        },
      ],
      1,
    ]);

    service = new AssetsService(
      prisma as never,
      analyticsService as never,
      auditService as never,
      notificationsService as never,
      riskService as never,
    );
  });

  it('enforces asset availability windows during search', async () => {
    const startAt = '2026-08-20T02:00:00.000Z';
    const endAt = '2026-08-22T02:00:00.000Z';

    await service.search(null, {
      startAt,
      endAt,
    });

    const findManyArgs = prisma.asset.findMany.mock.calls[0][0];
    expect(findManyArgs.where.AND).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          rentalRequests: expect.any(Object),
        }),
        {
          AND: [
            {
              availability: {
                none: {
                  availabilityType: AvailabilityType.BLOCKED,
                  startAt: {
                    lt: new Date(endAt),
                  },
                  endAt: {
                    gt: new Date(startAt),
                  },
                },
              },
            },
            {
              OR: [
                {
                  availability: {
                    none: {
                      availabilityType: AvailabilityType.AVAILABLE,
                    },
                  },
                },
                {
                  availability: {
                    some: {
                      availabilityType: AvailabilityType.AVAILABLE,
                      startAt: {
                        lte: new Date(startAt),
                      },
                      endAt: {
                        gte: new Date(endAt),
                      },
                    },
                  },
                },
              ],
            },
          ],
        },
      ]),
    );
  });
});
