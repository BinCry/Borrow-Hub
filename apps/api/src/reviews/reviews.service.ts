import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, RentalStatus, ReviewStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
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

  listForUser(userId: string) {
    return this.prisma.review.findMany({
      where: {
        revieweeId: userId,
        status: ReviewStatus.PUBLISHED,
      },
      orderBy: [{ createdAt: 'desc' }],
    });
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
}

