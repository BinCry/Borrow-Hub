import { Injectable, NotFoundException } from '@nestjs/common';
import { FaceMatchStatus, NotificationType, VerificationStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { maskDocumentNumber } from '../common/utils/mask.util';
import { KycReviewQueryDto, ReviewKycDto, SubmitKycDto } from './kyc.dto';

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  getCurrentStatus(userId: string) {
    return this.prisma.userVerification.findUnique({
      where: { userId },
    });
  }

  submit(userId: string, dto: SubmitKycDto) {
    return this.prisma.userVerification.upsert({
      where: { userId },
      update: {
        provider: dto.provider ?? 'mock-kyc',
        providerReference: dto.providerReference,
        verificationStatus: VerificationStatus.PENDING,
        documentType: dto.documentType,
        maskedDocumentNumber: maskDocumentNumber(dto.documentNumber),
        nameVerified: false,
        dateOfBirthVerified: false,
        faceMatchStatus: FaceMatchStatus.REVIEW_REQUIRED,
        verifiedAt: null,
      },
      create: {
        userId,
        provider: dto.provider ?? 'mock-kyc',
        providerReference: dto.providerReference,
        verificationStatus: VerificationStatus.PENDING,
        documentType: dto.documentType,
        maskedDocumentNumber: maskDocumentNumber(dto.documentNumber),
        nameVerified: false,
        dateOfBirthVerified: false,
        faceMatchStatus: FaceMatchStatus.REVIEW_REQUIRED,
      },
    });
  }

  listRequests(query: KycReviewQueryDto) {
    return this.prisma.userVerification.findMany({
      where: query.status
        ? {
            verificationStatus: query.status,
          }
        : undefined,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phone: true,
            trustScore: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
    });
  }

  async reviewRequest(
    userId: string,
    currentUser: AuthenticatedUser,
    dto: ReviewKycDto,
  ) {
    const existing = await this.prisma.userVerification.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });

    if (!existing) {
      throw new NotFoundException('KYC request not found');
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const verification = await tx.userVerification.update({
        where: { userId },
        data: {
          verificationStatus: dto.verificationStatus,
          faceMatchStatus:
            dto.faceMatchStatus ??
            (dto.verificationStatus === VerificationStatus.VERIFIED
              ? FaceMatchStatus.MATCHED
              : dto.verificationStatus === VerificationStatus.REJECTED
                ? FaceMatchStatus.NOT_MATCHED
                : FaceMatchStatus.REVIEW_REQUIRED),
          verifiedAt:
            dto.verificationStatus === VerificationStatus.VERIFIED
              ? new Date()
              : null,
          nameVerified:
            dto.verificationStatus === VerificationStatus.VERIFIED
              ? true
              : existing.nameVerified,
          dateOfBirthVerified:
            dto.verificationStatus === VerificationStatus.VERIFIED
              ? true
              : existing.dateOfBirthVerified,
        },
      });

      if (dto.verificationStatus === VerificationStatus.VERIFIED) {
        await tx.user.update({
          where: { id: userId },
          data: {
            trustScore: {
              increment: 20,
            },
          },
        });
      }

      return verification;
    });

    await this.notificationsService.createMany([userId], {
      type: NotificationType.KYC_UPDATED,
      title: 'Trạng thái eKYC đã được cập nhật',
      content: `Yêu cầu eKYC của bạn đã chuyển sang trạng thái ${updated.verificationStatus}.`,
      referenceType: 'kyc',
      referenceId: updated.id,
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'kyc.status.update',
      entityType: 'user_verification',
      entityId: updated.id,
      beforeData: {
        verificationStatus: existing.verificationStatus,
        faceMatchStatus: existing.faceMatchStatus,
      },
      afterData: {
        verificationStatus: updated.verificationStatus,
        faceMatchStatus: updated.faceMatchStatus,
        reviewNote: dto.reviewNote ?? null,
      },
    });

    return updated;
  }
}
