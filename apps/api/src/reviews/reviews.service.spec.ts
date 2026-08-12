import {
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { ReviewStatus } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { ReviewsService } from './reviews.service';

describe('ReviewsService', () => {
  const currentUser: AuthenticatedUser = {
    id: 'reviewer-1',
    email: 'reviewer@example.com',
    fullName: 'Reviewer',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const prisma = {
    review: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  let service: ReviewsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ReviewsService(
      prisma as never,
      notificationsService as never,
      auditService as never,
    );
  });

  it('updates a review inside the editable window', async () => {
    const createdAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerId: currentUser.id,
      revieweeId: 'reviewee-1',
      rating: 4,
      comment: 'old',
      createdAt,
      status: ReviewStatus.PUBLISHED,
    });
    prisma.systemConfig.findUnique.mockResolvedValue({ value: '24' });
    prisma.review.update.mockResolvedValue({
      id: 'review-1',
      reviewerId: currentUser.id,
      revieweeId: 'reviewee-1',
      rating: 5,
      comment: 'updated',
      createdAt,
      status: ReviewStatus.PUBLISHED,
    });
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }, { rating: 4 }]);
    prisma.user.update.mockResolvedValue({});

    const result = await service.update('review-1', currentUser, {
      rating: 5,
      comment: 'updated',
    });

    expect(prisma.review.update).toHaveBeenCalled();
    expect(auditService.create).toHaveBeenCalled();
    expect(result.rating).toBe(5);
    expect(result.comment).toBe('updated');
  });

  it('rejects editing a review after the configured window', async () => {
    const createdAt = new Date(Date.now() - 30 * 60 * 60 * 1000);
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerId: currentUser.id,
      revieweeId: 'reviewee-1',
      rating: 4,
      comment: 'old',
      createdAt,
      status: ReviewStatus.PUBLISHED,
    });
    prisma.systemConfig.findUnique.mockResolvedValue({ value: '24' });

    await expect(
      service.update('review-1', currentUser, {
        comment: 'too late',
      }),
    ).rejects.toBeInstanceOf(ConflictException);

    expect(prisma.review.update).not.toHaveBeenCalled();
  });

  it('moderates a review and recalculates trust score', async () => {
    prisma.review.findUnique.mockResolvedValue({
      id: 'review-1',
      reviewerId: currentUser.id,
      revieweeId: 'reviewee-1',
      rating: 4,
      comment: 'old',
      createdAt: new Date(),
      status: ReviewStatus.PUBLISHED,
    });
    prisma.review.update.mockResolvedValue({
      id: 'review-1',
      reviewerId: currentUser.id,
      revieweeId: 'reviewee-1',
      rating: 4,
      comment: 'old',
      createdAt: new Date(),
      status: ReviewStatus.HIDDEN,
    });
    prisma.review.findMany.mockResolvedValue([{ rating: 5 }]);
    prisma.user.update.mockResolvedValue({});

    const result = await service.moderate('review-1', currentUser, {
      status: ReviewStatus.HIDDEN,
    });

    expect(result.status).toBe(ReviewStatus.HIDDEN);
    expect(auditService.create).toHaveBeenCalled();
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it('fails moderating a missing review', async () => {
    prisma.review.findUnique.mockResolvedValue(null);

    await expect(
      service.moderate('missing-review', currentUser, {
        status: ReviewStatus.HIDDEN,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
