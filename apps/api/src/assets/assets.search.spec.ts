import { BadRequestException } from '@nestjs/common';
import { AssetStatus } from '@prisma/client';
import { AssetsService } from './assets.service';

describe('AssetsService search enhancements', () => {
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
    service = new AssetsService(
      prisma as never,
      analyticsService as never,
      auditService as never,
      notificationsService as never,
      riskService as never,
    );
  });

  it('filters by delivery method, rating and distance while hiding precise location', async () => {
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
        deliveryOptions: ['pickup', 'delivery'],
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
      {
        id: 'asset-2',
        ownerId: 'owner-2',
        categoryId: 'camera',
        title: 'Sony A7 IV',
        description: 'Full-frame camera',
        brand: 'Sony',
        model: 'A7 IV',
        serialNumber: null,
        condition: 'LIKE_NEW',
        estimatedValue: 45000000,
        pricePerDay: 280000,
        minimumDurationDays: 1,
        maximumDurationDays: 7,
        city: 'Hồ Chí Minh',
        district: 'Quận 1',
        ward: 'Bến Nghé',
        latitude: 10.775,
        longitude: 106.701,
        meetingPoint: 'Office B',
        deliveryOptions: ['pickup'],
        usageInstructions: null,
        cancellationPolicy: null,
        status: AssetStatus.ACTIVE,
        createdAt: new Date('2026-08-11T10:00:00.000Z'),
        updatedAt: new Date('2026-08-11T10:00:00.000Z'),
        category: { id: 'camera', name: 'Camera', slug: 'camera' },
        images: [],
        accessories: [],
        owner: {
          id: 'owner-2',
          fullName: 'Owner Two',
          trustScore: 85,
        },
      },
    ]);
    prisma.review.groupBy.mockResolvedValue([
      {
        revieweeId: 'owner-1',
        _avg: { rating: 4.8 },
      },
      {
        revieweeId: 'owner-2',
        _avg: { rating: 4.1 },
      },
    ]);
    prisma.rentalRequest.groupBy.mockResolvedValue([
      {
        assetId: 'asset-1',
        _count: { _all: 12 },
      },
      {
        assetId: 'asset-2',
        _count: { _all: 5 },
      },
    ]);

    const result = await service.search(null, {
      deliveryMethod: 'delivery',
      minRating: 4.5,
      latitude: 10.847,
      longitude: 106.773,
      radiusKm: 5,
      sort: 'nearest',
    });

    expect(result.pagination.total).toBe(1);
    expect(result.data).toEqual([
      expect.objectContaining({
        id: 'asset-1',
        ownerAverageRating: 4.8,
        completedRentalCount: 12,
        ward: null,
        latitude: null,
        longitude: null,
        meetingPoint: null,
        distanceKm: expect.any(Number),
      }),
    ]);
    expect(analyticsService.track).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: expect.objectContaining({
          deliveryMethod: 'delivery',
          minRating: 4.5,
          radiusKm: 5,
          sort: 'nearest',
          hasCoordinates: true,
        }),
      }),
    );
  });

  it('rejects nearest sort when coordinates are missing', async () => {
    await expect(
      service.search(null, {
        sort: 'nearest',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('hides exact location on public asset detail', async () => {
    prisma.asset.findUnique.mockResolvedValue({
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
      deliveryOptions: ['pickup', 'delivery'],
      usageInstructions: null,
      cancellationPolicy: null,
      status: AssetStatus.ACTIVE,
      createdAt: new Date('2026-08-10T10:00:00.000Z'),
      updatedAt: new Date('2026-08-10T10:00:00.000Z'),
      category: { id: 'camera', name: 'Camera', slug: 'camera' },
      images: [],
      accessories: [],
      availability: [],
      owner: {
        id: 'owner-1',
        fullName: 'Owner One',
        trustScore: 80,
        verification: {
          verificationStatus: 'VERIFIED',
        },
      },
    });

    const result = await service.getById('asset-1', null);

    expect(result).toEqual(
      expect.objectContaining({
        ward: null,
        latitude: null,
        longitude: null,
        meetingPoint: null,
        city: 'Hồ Chí Minh',
        district: 'Thủ Đức',
      }),
    );
  });
});
