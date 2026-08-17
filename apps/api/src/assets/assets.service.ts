import {
  AnalyticsEventType,
  AssetStatus,
  AvailabilityType,
  Prisma,
  RentalStatus,
  ReviewStatus,
  RoleName,
  VerificationStatus,
} from '@prisma/client';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { mkdir, writeFile } from 'fs/promises';
import { dirname, extname, resolve } from 'path';
import sharp from 'sharp';
import { PrismaService } from '../database/prisma.service';
import { AnalyticsService } from '../analytics/analytics.service';
import {
  CreateAssetDto,
  ModerateAssetDto,
  SearchAssetsQueryDto,
  UpdateAssetDto,
} from './assets.dto';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RiskService } from '../risk/risk.service';

type SearchAssetRecord = Prisma.AssetGetPayload<{
  include: {
    category: true;
    images: true;
    accessories: true;
    owner: {
      select: {
        id: true;
        fullName: true;
        trustScore: true;
      };
    };
  };
}>;

type AssetDetailRecord = Prisma.AssetGetPayload<{
  include: {
    category: true;
    images: true;
    accessories: true;
    availability: true;
    owner: {
      select: {
        id: true;
        fullName: true;
        trustScore: true;
        verification: {
          select: {
            verificationStatus: true;
          };
        };
      };
    };
  };
}>;

type EnrichedSearchAsset = SearchAssetRecord & {
  ownerAverageRating: number;
  completedRentalCount: number;
  distanceKm: number | null;
};

type UploadedAssetImageFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const SUPPORTED_ASSET_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly analyticsService: AnalyticsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly riskService: RiskService,
  ) {}

  async search(currentUser: AuthenticatedUser | null, query: SearchAssetsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const requestedStartAt = query.startAt ? new Date(query.startAt) : null;
    const requestedEndAt = query.endAt ? new Date(query.endAt) : null;
    this.assertSearchQuery(query, requestedStartAt, requestedEndAt);

    const where: Prisma.AssetWhereInput = {
      status:
        currentUser && this.isStaff(currentUser)
          ? query.status
          : AssetStatus.ACTIVE,
      categoryId: query.categoryId,
      city: query.city,
      district: query.district,
      condition: query.condition,
      pricePerDay: {
        gte: query.minPrice,
        lte: query.maxPrice,
      },
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword, mode: 'insensitive' } },
              { description: { contains: query.keyword, mode: 'insensitive' } },
              { brand: { contains: query.keyword, mode: 'insensitive' } },
              { model: { contains: query.keyword, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    if (requestedStartAt && requestedEndAt) {
      where.AND = [
        {
          rentalRequests: {
            none: {
              status: {
                in: [
                  'CONFIRMED',
                  'READY_FOR_HANDOVER',
                  'ONGOING',
                  'RETURN_PENDING',
                  'OVERDUE',
                ],
              },
              startAt: {
                lt: requestedEndAt,
              },
              endAt: {
                gt: requestedStartAt,
              },
            },
          },
        },
        this.buildAvailabilityDateRangeFilter(requestedStartAt, requestedEndAt),
      ];
    }

    const items = await this.prisma.asset.findMany({
      where,
      include: {
        category: true,
        images: {
          orderBy: [{ sortOrder: 'asc' }],
        },
        accessories: true,
        owner: {
          select: {
            id: true,
            fullName: true,
            trustScore: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });

    const enrichedItems = await this.enrichSearchAssets(items, currentUser, query);
    const filteredItems = this.filterSearchAssets(enrichedItems, query);
    const sortedItems = this.sortSearchAssets(filteredItems, query.sort);
    const total = sortedItems.length;
    const paginatedItems = sortedItems.slice(skip, skip + limit);

    await this.analyticsService.track({
      eventType: AnalyticsEventType.SEARCH_PERFORMED,
      userId: currentUser?.id ?? null,
      entityType: 'asset_search',
      metadata: {
        keyword: query.keyword ?? null,
        categoryId: query.categoryId ?? null,
        city: query.city ?? null,
        district: query.district ?? null,
        deliveryMethod: query.deliveryMethod ?? null,
        minRating: query.minRating ?? null,
        radiusKm: query.radiusKm ?? null,
        sort: query.sort ?? 'newest',
        hasDateRange: Boolean(query.startAt && query.endAt),
        hasCoordinates: query.latitude !== undefined && query.longitude !== undefined,
        page,
        limit,
        total,
      },
    });

    return {
      data: paginatedItems,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getById(assetId: string, currentUser?: AuthenticatedUser | null) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        category: true,
        images: {
          orderBy: [{ sortOrder: 'asc' }],
        },
        accessories: true,
        availability: {
          orderBy: [{ startAt: 'asc' }],
        },
        owner: {
          select: {
            id: true,
            fullName: true,
            trustScore: true,
            verification: {
              select: {
                verificationStatus: true,
              },
            },
          },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    const canViewPrivateAsset =
      !!currentUser &&
      (asset.ownerId === currentUser.id || this.isStaff(currentUser));

    if (asset.status !== AssetStatus.ACTIVE && !canViewPrivateAsset) {
      throw new NotFoundException('Asset not found');
    }

    await this.analyticsService.track({
      eventType: AnalyticsEventType.LISTING_VIEWED,
      userId: currentUser?.id ?? null,
      entityType: 'asset',
      entityId: asset.id,
      metadata: {
        ownerId: asset.ownerId,
        status: asset.status,
      },
    });

    return this.sanitizeLocationFields(asset, currentUser ?? null);
  }

  async listMine(currentUser: AuthenticatedUser) {
    return this.prisma.asset.findMany({
      where: {
        ownerId: currentUser.id,
      },
      include: {
        category: true,
        images: {
          orderBy: [{ sortOrder: 'asc' }],
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async uploadImage(
    currentUser: AuthenticatedUser,
    file: UploadedAssetImageFile | null,
  ) {
    if (!file) {
      throw new BadRequestException('An image file is required');
    }

    if (!SUPPORTED_ASSET_IMAGE_MIME_TYPES.has(file.mimetype)) {
      throw new BadRequestException('Unsupported image format');
    }

    if (!file.buffer?.length) {
      throw new BadRequestException('Uploaded image is empty');
    }

    const fileKey = this.buildAssetUploadFileKey(currentUser.id, { ...file, originalname: file.originalname.replace(/\.[^/.]+$/, "") + '.webp' });
    const uploadsRoot = resolve(__dirname, '..', '..', 'uploads');
    const outputPath = resolve(uploadsRoot, fileKey);

    await mkdir(dirname(outputPath), { recursive: true });
    
    // Resize & Convert to WebP using sharp
    const optimizedBuffer = await sharp(file.buffer)
      .resize({ width: 1200, withoutEnlargement: true }) // Max width 1200px
      .webp({ quality: 80 }) // Convert to webp with 80% quality
      .toBuffer();

    await writeFile(outputPath, optimizedBuffer);

    return {
      url: this.buildPublicUploadUrl(fileKey),
      fileKey,
    };
  }

  async create(currentUser: AuthenticatedUser, dto: CreateAssetDto) {
    this.assertVerifiedUser(currentUser);
    await this.ensureCategoryExists(dto.categoryId);
    this.assertDuration(dto.minimumDurationDays, dto.maximumDurationDays);
    this.assertAvailabilityWindows(dto.availability);

    const asset = await this.prisma.asset.create({
      data: {
        ownerId: currentUser.id,
        categoryId: dto.categoryId,
        title: dto.title,
        description: dto.description,
        brand: dto.brand,
        model: dto.model,
        serialNumber: dto.serialNumber,
        condition: dto.condition,
        estimatedValue: dto.estimatedValue,
        pricePerDay: dto.pricePerDay,
        minimumDurationDays: dto.minimumDurationDays,
        maximumDurationDays: dto.maximumDurationDays,
        city: dto.city,
        district: dto.district,
        ward: dto.ward,
        latitude: dto.latitude,
        longitude: dto.longitude,
        meetingPoint: dto.meetingPoint,
        deliveryOptions: dto.deliveryOptions,
        usageInstructions: dto.usageInstructions,
        cancellationPolicy: dto.cancellationPolicy,
        status: AssetStatus.PENDING_REVIEW,
        images: dto.images?.length
          ? {
              create: dto.images.map((image, index) => ({
                url: image.url,
                fileKey: image.fileKey,
                metadata: image.metadata as Prisma.InputJsonValue | undefined,
                sortOrder: image.sortOrder ?? index,
                isCover: image.isCover ?? index === 0,
              })),
            }
          : undefined,
        accessories: dto.accessories?.length
          ? {
              create: dto.accessories.map((accessory) => ({
                name: accessory.name,
                quantity: accessory.quantity,
                description: accessory.description,
              })),
            }
          : undefined,
        availability: dto.availability?.length
          ? {
              create: dto.availability.map((availability) => ({
                startAt: new Date(availability.startAt),
                endAt: new Date(availability.endAt),
                availabilityType:
                  availability.availabilityType ?? AvailabilityType.BLOCKED,
              })),
            }
          : undefined,
      },
      include: {
        images: true,
        accessories: true,
        availability: true,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'asset.create',
      entityType: 'asset',
      entityId: asset.id,
      afterData: {
        status: asset.status,
        title: asset.title,
      },
    });

    await this.riskService.assessAssetSubmission({
      assetId: asset.id,
      ownerId: currentUser.id,
      title: asset.title,
      description: asset.description,
      brand: asset.brand,
      model: asset.model,
      estimatedValue: asset.estimatedValue,
    });

    return asset;
  }

  async update(
    assetId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateAssetDto,
  ) {
    const asset = await this.ensureAssetExists(assetId);
    this.assertAssetEditable(asset, currentUser);

    if (dto.categoryId) {
      await this.ensureCategoryExists(dto.categoryId);
    }

    if (
      dto.minimumDurationDays !== undefined ||
      dto.maximumDurationDays !== undefined
    ) {
      this.assertDuration(
        dto.minimumDurationDays ?? asset.minimumDurationDays,
        dto.maximumDurationDays ?? asset.maximumDurationDays,
      );
    }

    this.assertAvailabilityWindows(dto.availability);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.images) {
        await tx.assetImage.deleteMany({
          where: { assetId },
        });
      }

      if (dto.accessories) {
        await tx.assetAccessory.deleteMany({
          where: { assetId },
        });
      }

      if (dto.availability) {
        await tx.assetAvailability.deleteMany({
          where: { assetId },
        });
      }

      return tx.asset.update({
        where: { id: assetId },
        data: {
          categoryId: dto.categoryId,
          title: dto.title,
          description: dto.description,
          brand: dto.brand,
          model: dto.model,
          serialNumber: dto.serialNumber,
          condition: dto.condition,
          estimatedValue: dto.estimatedValue,
          pricePerDay: dto.pricePerDay,
          minimumDurationDays: dto.minimumDurationDays,
          maximumDurationDays: dto.maximumDurationDays,
          city: dto.city,
          district: dto.district,
          ward: dto.ward,
          latitude: dto.latitude,
          longitude: dto.longitude,
          meetingPoint: dto.meetingPoint,
          deliveryOptions: dto.deliveryOptions,
          usageInstructions: dto.usageInstructions,
          cancellationPolicy: dto.cancellationPolicy,
          status:
            asset.status === AssetStatus.REJECTED ||
            asset.status === AssetStatus.DRAFT
              ? AssetStatus.PENDING_REVIEW
              : asset.status,
          images: dto.images
            ? {
                create: dto.images.map((image, index) => ({
                  url: image.url,
                  fileKey: image.fileKey,
                  metadata: image.metadata as Prisma.InputJsonValue | undefined,
                  sortOrder: image.sortOrder ?? index,
                  isCover: image.isCover ?? index === 0,
                })),
              }
            : undefined,
          accessories: dto.accessories
            ? {
                create: dto.accessories.map((accessory) => ({
                  name: accessory.name,
                  quantity: accessory.quantity,
                  description: accessory.description,
                })),
              }
            : undefined,
          availability: dto.availability
            ? {
                create: dto.availability.map((availability) => ({
                  startAt: new Date(availability.startAt),
                  endAt: new Date(availability.endAt),
                  availabilityType:
                    availability.availabilityType ?? AvailabilityType.BLOCKED,
                })),
              }
            : undefined,
        },
        include: {
          images: {
            orderBy: [{ sortOrder: 'asc' }],
          },
          accessories: true,
          availability: {
            orderBy: [{ startAt: 'asc' }],
          },
        },
      });
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'asset.update',
      entityType: 'asset',
      entityId: assetId,
      beforeData: { status: asset.status, title: asset.title },
      afterData: { status: updated.status, title: updated.title },
    });

    await this.riskService.assessAssetSubmission({
      assetId: updated.id,
      ownerId: updated.ownerId,
      title: updated.title,
      description: updated.description,
      brand: updated.brand,
      model: updated.model,
      estimatedValue: updated.estimatedValue,
    });

    return updated;
  }

  async moderate(
    assetId: string,
    currentUser: AuthenticatedUser,
    dto: ModerateAssetDto,
  ) {
    const asset = await this.ensureAssetExists(assetId);

    const allowedStatuses: AssetStatus[] = [
      AssetStatus.ACTIVE,
      AssetStatus.REJECTED,
      AssetStatus.SUSPENDED,
      AssetStatus.PAUSED,
      AssetStatus.ARCHIVED,
    ];

    if (!allowedStatuses.includes(dto.status)) {
      throw new ConflictException('Unsupported moderation status');
    }

    const updated = await this.prisma.asset.update({
      where: { id: assetId },
      data: {
        status: dto.status,
      },
    });

    await this.notificationsService.createMany([asset.ownerId], {
      type: 'ASSET_MODERATED',
      title: this.buildModerationTitle(dto.status),
      content: this.buildModerationContent(asset.title, dto.status, dto.reason),
      metadata: {
        assetId: asset.id,
      },
      referenceType: 'asset',
      referenceId: asset.id,
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'asset.moderate',
      entityType: 'asset',
      entityId: asset.id,
      beforeData: { status: asset.status },
      afterData: { status: updated.status, moderationReason: dto.reason ?? null },
    });

    return updated;
  }

  private buildModerationTitle(status: AssetStatus) {
    switch (status) {
      case AssetStatus.ACTIVE:
        return 'Listing đã được duyệt';
      case AssetStatus.REJECTED:
        return 'Listing bị từ chối';
      case AssetStatus.SUSPENDED:
        return 'Listing đã bị khóa';
      case AssetStatus.PAUSED:
        return 'Listing đã tạm dừng';
      case AssetStatus.ARCHIVED:
        return 'Listing đã lưu trữ';
      default:
        return 'Cập nhật trạng thái tài sản';
    }
  }

  private buildModerationContent(
    assetTitle: string,
    status: AssetStatus,
    reason?: string,
  ) {
    const baseMessage = `Tài sản "${assetTitle}" đã được cập nhật sang trạng thái ${status}.`;

    if (!reason?.trim()) {
      return baseMessage;
    }

    return `${baseMessage} Lý do: ${reason.trim()}`;
  }

  private buildAvailabilityDateRangeFilter(startAt: Date, endAt: Date) {
    return {
      AND: [
        {
          availability: {
            none: {
              availabilityType: AvailabilityType.BLOCKED,
              startAt: {
                lt: endAt,
              },
              endAt: {
                gt: startAt,
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
                    lte: startAt,
                  },
                  endAt: {
                    gte: endAt,
                  },
                },
              },
            },
          ],
        },
      ],
    } satisfies Prisma.AssetWhereInput;
  }

  private assertAvailabilityWindows(availability?: CreateAssetDto['availability']) {
    if (!availability?.length) {
      return;
    }

    availability.forEach((window) => {
      const startAt = new Date(window.startAt);
      const endAt = new Date(window.endAt);

      if (startAt >= endAt) {
        throw new ConflictException(
          'Availability start time must be before end time',
        );
      }
    });
  }

  private assertSearchQuery(
    query: SearchAssetsQueryDto,
    requestedStartAt: Date | null,
    requestedEndAt: Date | null,
  ) {
    if ((query.startAt && !query.endAt) || (!query.startAt && query.endAt)) {
      throw new BadRequestException(
        'startAt and endAt must be provided together',
      );
    }

    if (
      (requestedStartAt && Number.isNaN(requestedStartAt.getTime())) ||
      (requestedEndAt && Number.isNaN(requestedEndAt.getTime()))
    ) {
      throw new BadRequestException('Invalid search date range');
    }

    if (requestedStartAt && requestedEndAt && requestedStartAt >= requestedEndAt) {
      throw new BadRequestException('Search start time must be before end time');
    }

    const hasLatitude = query.latitude !== undefined;
    const hasLongitude = query.longitude !== undefined;

    if (hasLatitude !== hasLongitude) {
      throw new BadRequestException(
        'latitude and longitude must be provided together',
      );
    }

    if ((query.radiusKm !== undefined || query.sort === 'nearest') && !hasLatitude) {
      throw new BadRequestException(
        'latitude and longitude are required for distance-based search',
      );
    }
  }

  private async enrichSearchAssets(
    items: SearchAssetRecord[],
    currentUser: AuthenticatedUser | null,
    query: SearchAssetsQueryDto,
  ): Promise<EnrichedSearchAsset[]> {
    if (items.length === 0) {
      return [];
    }

    const ownerIds = [...new Set(items.map((item) => item.ownerId))];
    const assetIds = items.map((item) => item.id);

    const [ratingGroups, rentalGroups] = await Promise.all([
      this.prisma.review.groupBy({
        by: ['revieweeId'],
        _avg: {
          rating: true,
        },
        where: {
          revieweeId: {
            in: ownerIds,
          },
          status: ReviewStatus.PUBLISHED,
        },
      }),
      this.prisma.rentalRequest.groupBy({
        by: ['assetId'],
        _count: {
          _all: true,
        },
        where: {
          assetId: {
            in: assetIds,
          },
          status: RentalStatus.COMPLETED,
        },
      }),
    ]);

    const ratingMap = new Map(
      ratingGroups.map((group) => [
        group.revieweeId,
        Number((group._avg.rating ?? 0).toFixed(2)),
      ]),
    );
    const completedRentalCountMap = new Map(
      rentalGroups.map((group) => [group.assetId, group._count._all]),
    );

    return items.map((item) => ({
      ...this.sanitizeLocationFields(item, currentUser),
      ownerAverageRating: ratingMap.get(item.ownerId) ?? 0,
      completedRentalCount: completedRentalCountMap.get(item.id) ?? 0,
      distanceKm: this.calculateDistanceKm(
        query.latitude,
        query.longitude,
        item.latitude,
        item.longitude,
      ),
    }));
  }

  private filterSearchAssets(
    items: EnrichedSearchAsset[],
    query: SearchAssetsQueryDto,
  ) {
    return items.filter((item) => {
      if (query.deliveryMethod) {
        const requestedDeliveryMethod = query.deliveryMethod.trim().toLowerCase();
        const deliveryOptions = this.normalizeDeliveryOptions(item.deliveryOptions);

        if (
          !deliveryOptions.some(
            (option) => option.toLowerCase() === requestedDeliveryMethod,
          )
        ) {
          return false;
        }
      }

      if (
        query.minRating !== undefined &&
        item.ownerAverageRating < query.minRating
      ) {
        return false;
      }

      if (query.radiusKm !== undefined) {
        if (item.distanceKm === null || item.distanceKm > query.radiusKm) {
          return false;
        }
      }

      return true;
    });
  }

  private sortSearchAssets(
    items: EnrichedSearchAsset[],
    sort: SearchAssetsQueryDto['sort'],
  ) {
    return [...items].sort((left, right) => {
      switch (sort) {
        case 'lowest-price':
          return left.pricePerDay - right.pricePerDay || this.compareNewest(left, right);
        case 'highest-price':
          return right.pricePerDay - left.pricePerDay || this.compareNewest(left, right);
        case 'highest-rating':
          return (
            right.ownerAverageRating - left.ownerAverageRating ||
            this.compareNewest(left, right)
          );
        case 'most-rented':
          return (
            right.completedRentalCount - left.completedRentalCount ||
            this.compareNewest(left, right)
          );
        case 'nearest':
          return this.compareNearest(left, right);
        case 'newest':
        default:
          return this.compareNewest(left, right);
      }
    });
  }

  private compareNewest(
    left: { createdAt: Date },
    right: { createdAt: Date },
  ) {
    return right.createdAt.getTime() - left.createdAt.getTime();
  }

  private compareNearest(
    left: { distanceKm: number | null; createdAt: Date },
    right: { distanceKm: number | null; createdAt: Date },
  ) {
    if (left.distanceKm === null && right.distanceKm === null) {
      return this.compareNewest(left, right);
    }

    if (left.distanceKm === null) {
      return 1;
    }

    if (right.distanceKm === null) {
      return -1;
    }

    return left.distanceKm - right.distanceKm || this.compareNewest(left, right);
  }

  private calculateDistanceKm(
    userLatitude?: number,
    userLongitude?: number,
    assetLatitude?: number | null,
    assetLongitude?: number | null,
  ) {
    if (
      userLatitude === undefined ||
      userLongitude === undefined ||
      assetLatitude === null ||
      assetLatitude === undefined ||
      assetLongitude === null ||
      assetLongitude === undefined
    ) {
      return null;
    }

    const earthRadiusKm = 6371;
    const latitudeDelta = this.toRadians(assetLatitude - userLatitude);
    const longitudeDelta = this.toRadians(assetLongitude - userLongitude);
    const startLatitude = this.toRadians(userLatitude);
    const endLatitude = this.toRadians(assetLatitude);

    const haversine =
      Math.sin(latitudeDelta / 2) ** 2 +
      Math.cos(startLatitude) *
        Math.cos(endLatitude) *
        Math.sin(longitudeDelta / 2) ** 2;
    const distance =
      2 * earthRadiusKm * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

    return Number(distance.toFixed(2));
  }

  private toRadians(value: number) {
    return (value * Math.PI) / 180;
  }

  private buildAssetUploadFileKey(
    userId: string,
    file: UploadedAssetImageFile,
  ) {
    const extension =
      this.resolveImageExtension(file.mimetype) ||
      extname(file.originalname).toLowerCase() ||
      '.jpg';

    return `assets/${userId}/${Date.now()}-${randomUUID()}${extension}`;
  }

  private resolveImageExtension(mimetype: string) {
    switch (mimetype) {
      case 'image/png':
        return '.png';
      case 'image/webp':
        return '.webp';
      case 'image/heic':
        return '.heic';
      case 'image/heif':
        return '.heif';
      case 'image/jpeg':
      default:
        return '.jpg';
    }
  }

  private buildPublicUploadUrl(fileKey: string) {
    const appUrl = this.configService.get<string>('APP_URL') ?? 'http://localhost:3000';
    return `${appUrl.replace(/\/+$/, '')}/uploads/${fileKey.replace(/\\/g, '/')}`;
  }

  private normalizeDeliveryOptions(deliveryOptions: Prisma.JsonValue | null) {
    if (!Array.isArray(deliveryOptions)) {
      return [];
    }

    return deliveryOptions.filter(
      (option): option is string => typeof option === 'string',
    );
  }

  private sanitizeLocationFields<T extends SearchAssetRecord | AssetDetailRecord>(
    asset: T,
    currentUser: AuthenticatedUser | null,
  ) {
    const canViewPreciseLocation =
      !!currentUser &&
      (asset.ownerId === currentUser.id || this.isStaff(currentUser));

    if (canViewPreciseLocation) {
      return asset;
    }

    return {
      ...asset,
      ward: null,
      latitude: null,
      longitude: null,
      meetingPoint: null,
    };
  }

  private assertVerifiedUser(currentUser: AuthenticatedUser) {
    if (currentUser.verificationStatus !== VerificationStatus.VERIFIED) {
      throw new ForbiddenException(
        'Only verified users can create asset listings',
      );
    }
  }

  private assertDuration(minimumDurationDays: number, maximumDurationDays: number) {
    if (minimumDurationDays > maximumDurationDays) {
      throw new ConflictException(
        'Minimum duration cannot exceed maximum duration',
      );
    }
  }

  private async ensureCategoryExists(categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  private async ensureAssetExists(assetId: string) {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    return asset;
  }

  private assertAssetEditable(
    asset: {
      ownerId: string;
      status: AssetStatus;
      title: string;
    },
    currentUser: AuthenticatedUser,
  ) {
    if (asset.ownerId !== currentUser.id && !this.isStaff(currentUser)) {
      throw new ForbiddenException('You cannot edit this asset');
    }

    const lockedStatuses: AssetStatus[] = [
      AssetStatus.SUSPENDED,
      AssetStatus.ARCHIVED,
    ];

    if (lockedStatuses.includes(asset.status) && !this.isStaff(currentUser)) {
      throw new ConflictException('Archived or suspended assets cannot be edited');
    }
  }

  private isStaff(currentUser: AuthenticatedUser) {
    const staffRoles: RoleName[] = [
      RoleName.MODERATOR,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];

    return currentUser.roles.some((role) => staffRoles.includes(role));
  }
}
