import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, RentalStatus, ReviewStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto, ModerateReviewDto, UpdateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
  ) {}

  async create(
    rentalId: string,
    currentUser: AuthenticatedUser,
    dto: CreateReviewDto,
  ) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      include: {
        asset: true,
      },
    });

    if (!rental) {
      throw new NotFoundException('Rental not found');
    }

    if (rental.status !== RentalStatus.COMPLETED) {
      throw new ConflictException('Only completed rentals can be reviewed');
    }

    const isOwner = rental.ownerId === currentUser.id;
    const isRenter = rental.renterId === currentUser.id;

    if (!isOwner && !isRenter) {
      throw new ForbiddenException('You cannot review this rental');
    }

    const reviewerId = currentUser.id;
    const revieweeId = isOwner ? rental.renterId : rental.ownerId;

    const existing = await this.prisma.review.findUnique({
      where: {
        rentalId_reviewerId: {
          rentalId,
          reviewerId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('You have already reviewed this rental');
    }

    const review = await this.prisma.review.create({
      data: {
        rentalId,
        reviewerId,
        revieweeId,
        rating: dto.rating,
        comment: dto.comment,
        status: ReviewStatus.PUBLISHED,
      },
    });

    await this.notificationsService.createMany([revieweeId], {
      type: NotificationType.REVIEW_REMINDER,
      title: 'Bạn vừa nhận được đánh giá mới',
      content: `Bạn vừa nhận được một đánh giá mới cho giao dịch "${rental.asset.title}".`,
      referenceType: 'rental',
      referenceId: rental.id,
    });

    await this.recalculateTrustScore(revieweeId);
    return review;
  }

  async update(
    reviewId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.reviewerId !== currentUser.id) {
      throw new ForbiddenException('You cannot edit this review');
    }

    const editableHours = await this.getReviewEditHours();
    const editDeadline = new Date(
      review.createdAt.getTime() + editableHours * 60 * 60 * 1000,
    );

    if (new Date() > editDeadline) {
      throw new ConflictException('Review edit window has expired');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        rating: dto.rating,
        comment: dto.comment,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'review.update',
      entityType: 'review',
      entityId: updated.id,
      beforeData: {
        rating: review.rating,
        comment: review.comment,
      },
      afterData: {
        rating: updated.rating,
        comment: updated.comment,
      },
    });

    await this.recalculateTrustScore(review.revieweeId);
    return updated;
  }

  listForUser(userId: string) {
    return this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  listAll() {
    return this.prisma.review.findMany({
      include: {
        reviewer: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        reviewee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        rental: {
          select: {
            id: true,
            assetId: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async moderate(
    reviewId: string,
    currentUser: AuthenticatedUser,
    dto: ModerateReviewDto,
  ) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        status: dto.status,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'review.moderate',
      entityType: 'review',
      entityId: updated.id,
      beforeData: { status: review.status },
      afterData: { status: updated.status },
    });

    await this.recalculateTrustScore(review.revieweeId);
    return updated;
  }

  private async recalculateTrustScore(userId: string) {
    const reviews = await this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        status: ReviewStatus.PUBLISHED,
      },
      select: {
        rating: true,
      },
    });

    if (reviews.length === 0) {
      return;
    }

    const averageRating =
      reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    const trustScore = Math.min(100, Math.round(averageRating * 20));

    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore },
    });
  }

  private async getReviewEditHours() {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key: 'review_edit_hours' },
    });

    return config ? Number(config.value) : 24;
  }
}
