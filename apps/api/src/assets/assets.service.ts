import {
  AnalyticsEventType,
  AssetStatus,
  AvailabilityType,
  Prisma,
  RoleName,
  VerificationStatus,
} from '@prisma/client';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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

@Injectable()
export class AssetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly riskService: RiskService,
  ) {}

  async search(currentUser: AuthenticatedUser | null, query: SearchAssetsQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

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

    if (query.startAt && query.endAt) {
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
                lt: new Date(query.endAt),
              },
              endAt: {
                gt: new Date(query.startAt),
              },
            },
          },
        },
      ];
    }

    const orderBy = this.buildOrderBy(query.sort);

    const [items, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
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
        orderBy,
        skip,
        take: limit,
      }),
      this.prisma.asset.count({ where }),
    ]);

    await this.analyticsService.track({
      eventType: AnalyticsEventType.SEARCH_PERFORMED,
      userId: currentUser?.id ?? null,
      entityType: 'asset_search',
      metadata: {
        keyword: query.keyword ?? null,
        categoryId: query.categoryId ?? null,
        city: query.city ?? null,
        district: query.district ?? null,
        hasDateRange: Boolean(query.startAt && query.endAt),
        page,
        limit,
        total,
      },
    });

    return {
      data: items,
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

    return asset;
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

  async create(currentUser: AuthenticatedUser, dto: CreateAssetDto) {
    this.assertVerifiedUser(currentUser);
    await this.ensureCategoryExists(dto.categoryId);
    this.assertDuration(dto.minimumDurationDays, dto.maximumDurationDays);

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

  private buildOrderBy(sort?: SearchAssetsQueryDto['sort']) {
    switch (sort) {
      case 'lowest-price':
        return [{ pricePerDay: 'asc' as const }];
      case 'highest-price':
        return [{ pricePerDay: 'desc' as const }];
      case 'newest':
      default:
        return [{ createdAt: 'desc' as const }];
    }
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
