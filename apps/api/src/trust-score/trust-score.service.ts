import { Injectable } from '@nestjs/common';
import {
  DisputeStatus,
  ReviewStatus,
  RiskIncidentStatus,
  RiskTargetType,
  VerificationStatus,
} from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

@Injectable()
export class TrustScoreService {
  constructor(private readonly prisma: PrismaService) {}

  async recalculateUserTrustScore(userId: string) {
    const openDisputeStatuses = [
      DisputeStatus.OPEN,
      DisputeStatus.WAITING_RESPONSE,
      DisputeStatus.UNDER_REVIEW,
    ];
    const openRiskStatuses = [
      RiskIncidentStatus.OPEN,
      RiskIncidentStatus.UNDER_REVIEW,
    ];

    const [
      user,
      publishedReviewAggregate,
      completedRentalCount,
      openDisputeCount,
      overdueRentalCount,
      openRiskIncidentCount,
    ] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          createdAt: true,
          verification: {
            select: {
              verificationStatus: true,
            },
          },
        },
      }),
      this.prisma.review.aggregate({
        _avg: {
          rating: true,
        },
        where: {
          revieweeId: userId,
          status: ReviewStatus.PUBLISHED,
        },
      }),
      this.prisma.rentalRequest.count({
        where: {
          status: 'COMPLETED',
          OR: [{ ownerId: userId }, { renterId: userId }],
        },
      }),
      this.prisma.dispute.count({
        where: {
          status: {
            in: openDisputeStatuses,
          },
          rental: {
            OR: [{ ownerId: userId }, { renterId: userId }],
          },
        },
      }),
      this.prisma.rentalRequest.count({
        where: {
          renterId: userId,
          status: 'OVERDUE',
        },
      }),
      this.prisma.riskIncident.count({
        where: {
          targetType: RiskTargetType.USER,
          targetId: userId,
          status: {
            in: openRiskStatuses,
          },
        },
      }),
    ]);

    const verificationBonus =
      user.verification?.verificationStatus === VerificationStatus.VERIFIED ? 20 : 0;
    const ratingBonus = Math.round((publishedReviewAggregate._avg.rating ?? 0) * 12);
    const completedRentalBonus = Math.min(completedRentalCount * 2, 10);
    const accountAgeDays =
      (Date.now() - user.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    const accountAgeBonus =
      (accountAgeDays >= 30 ? 5 : 0) + (accountAgeDays >= 180 ? 5 : 0);

    const openDisputePenalty = Math.min(openDisputeCount * 8, 24);
    const overduePenalty = Math.min(overdueRentalCount * 5, 15);
    const openRiskPenalty = Math.min(openRiskIncidentCount * 10, 20);

    const trustScore = this.clampScore(
      verificationBonus +
        ratingBonus +
        completedRentalBonus +
        accountAgeBonus -
        openDisputePenalty -
        overduePenalty -
        openRiskPenalty,
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { trustScore },
    });

    return trustScore;
  }

  private clampScore(score: number) {
    return Math.max(0, Math.min(100, score));
  }
}
