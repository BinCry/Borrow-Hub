import { AssetStatus, AvailabilityType } from '@prisma/client';
import { AssetsService } from './assets.service';

describe('AssetsService availability filters', () => {
  const prisma = {
    asset: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    review: {
      groupBy: jest.fn(),
    },
    rentalRequest: {
      groupBy: jest.fn(),
    },
  };

  const analyticsService = {
    track: jest.fn(),
  };

  const configService = {
    get: jest.fn().mockReturnValue('http://localhost:3000'),
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
    prisma.asset.findMany.mockResolvedValue([
      {
        id: 'asset-1',
        ownerId: 'owner-1',
        categoryId: 'camera',
        title: 'Canon R6',
        description: 'Mirrorless camera',
        brand: 'Canon',
        model: 'R6',
        serialNumber: null,
        condition: 'LIKE_NEW',
        estimatedValue: 40000000,
        pricePerDay: 300000,
        minimumDurationDays: 1,
        maximumDurationDays: 7,
        city: 'Hồ Chí Minh',
        district: 'Thủ Đức',
        ward: 'Linh Tây',
        latitude: 10.849,
        longitude: 106.771,
        meetingPoint: 'Studio A',
        deliveryOptions: ['pickup'],
        usageInstructions: null,
        cancellationPolicy: null,
        status: AssetStatus.ACTIVE,
        createdAt: new Date('2026-08-10T10:00:00.000Z'),
        updatedAt: new Date('2026-08-10T10:00:00.000Z'),
        category: { id: 'camera', name: 'Camera', slug: 'camera' },
        images: [],
        accessories: [],
        owner: {
          id: 'owner-1',
          fullName: 'Owner One',
          trustScore: 80,
        },
      },
    ]);
    prisma.review.groupBy.mockResolvedValue([]);
    prisma.rentalRequest.groupBy.mockResolvedValue([]);

    service = new AssetsService(
      prisma as never,
      configService as never,
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
