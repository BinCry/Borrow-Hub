import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AnalyticsEventType,
  FaceMatchStatus,
  NotificationType,
  VerificationStatus,
} from '@prisma/client';
import { randomUUID } from 'crypto';
import sharp from 'sharp';
import { AnalyticsService } from '../analytics/analytics.service';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { maskDocumentNumber } from '../common/utils/mask.util';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { TrustScoreService } from '../trust-score/trust-score.service';
import { KycReviewQueryDto, ReviewKycDto, SubmitKycDto } from './kyc.dto';

type KycUploadFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

export type KycUploadFiles = {
  documentFront?: KycUploadFile[];
  documentBack?: KycUploadFile[];
  selfie?: KycUploadFile[];
};

const SUPPORTED_KYC_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
]);

@Injectable()
export class KycService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly analyticsService: AnalyticsService,
    private readonly notificationsService: NotificationsService,
    private readonly trustScoreService: TrustScoreService,
    private readonly storageService: StorageService,
  ) {}

  async getCurrentStatus(userId: string) {
    const verification = await this.prisma.userVerification.findUnique({
      where: { userId },
    });
    return verification ? this.toPublicVerification(verification) : null;
  }

  async submit(userId: string, dto: SubmitKycDto, files: KycUploadFiles) {
    const documentFront = files?.documentFront?.[0];
    const documentBack = files?.documentBack?.[0];
    const selfie = files?.selfie?.[0];

    if (!documentFront || !selfie || (dto.documentType === 'CCCD' && !documentBack)) {
      throw new BadRequestException(
        'Document front, document back and selfie are required for CCCD verification',
      );
    }

    [documentFront, documentBack, selfie].filter(Boolean).forEach((file) => {
      if (!file || !SUPPORTED_KYC_MIME_TYPES.has(file.mimetype) || !file.buffer.length) {
        throw new BadRequestException(
          'KYC files must be valid JPEG, PNG, WebP, HEIC or HEIF images',
        );
      }
    });

    const existing = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (existing?.verificationStatus === VerificationStatus.VERIFIED) {
      throw new ConflictException('Verified identity cannot be resubmitted');
    }

    const uploadId = randomUUID();
    const uploadedKeys: string[] = [];

    try {
      const documentFrontKey = await this.storeImage(
        userId,
        uploadId,
        'document-front',
        documentFront,
      );
      uploadedKeys.push(documentFrontKey);
      const documentBackKey = documentBack
        ? await this.storeImage(userId, uploadId, 'document-back', documentBack)
        : null;
      if (documentBackKey) uploadedKeys.push(documentBackKey);
      const selfieKey = await this.storeImage(
        userId,
        uploadId,
        'selfie',
        selfie,
      );
      uploadedKeys.push(selfieKey);

      const verification = await this.prisma.userVerification.upsert({
        where: { userId },
        update: {
          provider: 'manual-review',
          providerReference: uploadId,
          verificationStatus: VerificationStatus.PENDING,
          documentType: dto.documentType,
          maskedDocumentNumber: maskDocumentNumber(dto.documentNumber),
          documentFrontKey,
          documentBackKey,
          selfieKey,
          nameVerified: false,
          dateOfBirthVerified: false,
          faceMatchStatus: FaceMatchStatus.REVIEW_REQUIRED,
          verifiedAt: null,
        },
        create: {
          userId,
          provider: 'manual-review',
          providerReference: uploadId,
          verificationStatus: VerificationStatus.PENDING,
          documentType: dto.documentType,
          maskedDocumentNumber: maskDocumentNumber(dto.documentNumber),
          documentFrontKey,
          documentBackKey,
          selfieKey,
          faceMatchStatus: FaceMatchStatus.REVIEW_REQUIRED,
        },
      });

      await this.deleteReplacedDocuments(existing, uploadedKeys);
      await this.analyticsService
        .track({
          eventType: AnalyticsEventType.KYC_STARTED,
          userId,
          entityType: 'user_verification',
          entityId: verification.id,
          metadata: {
            documentType: verification.documentType,
            provider: verification.provider,
          },
        })
        .catch(() => undefined);

      return this.toPublicVerification(verification);
    } catch (error) {
      await Promise.allSettled(
        uploadedKeys.map((key) =>
          this.storageService.deleteSensitiveDocument(key),
        ),
      );
      throw error;
    }
  }

  async listRequests(query: KycReviewQueryDto) {
    const requests = await this.prisma.userVerification.findMany({
      where: query.status ? { verificationStatus: query.status } : undefined,
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

    return Promise.all(
      requests.map(async (request) => {
        const { documentFrontKey, documentBackKey, selfieKey, ...safeRequest } =
          request;
        return {
          ...safeRequest,
          documentFrontUrl: documentFrontKey
            ? await this.storageService.getSignedUrlForSensitiveDocument(
                documentFrontKey,
              )
            : null,
          documentBackUrl: documentBackKey
            ? await this.storageService.getSignedUrlForSensitiveDocument(
                documentBackKey,
              )
            : null,
          selfieUrl: selfieKey
            ? await this.storageService.getSignedUrlForSensitiveDocument(selfieKey)
            : null,
        };
      }),
    );
  }

  async reviewRequest(
    userId: string,
    currentUser: AuthenticatedUser,
    dto: ReviewKycDto,
  ) {
    const existing = await this.prisma.userVerification.findUnique({
      where: { userId },
    });

    if (!existing) {
      throw new NotFoundException('KYC request not found');
    }

    if (
      dto.verificationStatus === VerificationStatus.VERIFIED &&
      (!existing.documentFrontKey || !existing.selfieKey)
    ) {
      throw new ConflictException('KYC evidence is incomplete');
    }

    const updated = await this.prisma.userVerification.update({
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

    await Promise.allSettled([
      this.notificationsService.createMany([userId], {
        type: NotificationType.KYC_UPDATED,
        title: 'Trạng thái eKYC đã được cập nhật',
        content: `Yêu cầu eKYC của bạn đã chuyển sang trạng thái ${updated.verificationStatus}.`,
        referenceType: 'kyc',
        referenceId: updated.id,
      }),
      this.auditService.create({
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
      }),
    ]);

    if (updated.verificationStatus === VerificationStatus.VERIFIED) {
      await this.analyticsService.track({
        eventType: AnalyticsEventType.KYC_COMPLETED,
        userId,
        entityType: 'user_verification',
        entityId: updated.id,
        metadata: { reviewedBy: currentUser.id },
      });
    }

    await this.trustScoreService.recalculateUserTrustScore(userId);
    return this.toPublicVerification(updated);
  }

  private async storeImage(
    userId: string,
    uploadId: string,
    kind: string,
    file: KycUploadFile,
  ) {
    const body = await sharp(file.buffer)
      .rotate()
      .resize({
        width: 1800,
        height: 1800,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: 88 })
      .toBuffer();
    return this.storageService.uploadSensitiveDocument(
      `kyc/${userId}/${uploadId}-${kind}.webp`,
      body,
      'image/webp',
    );
  }

  private async deleteReplacedDocuments(
    existing: {
      documentFrontKey: string | null;
      documentBackKey: string | null;
      selfieKey: string | null;
    } | null,
    newKeys: string[],
  ) {
    if (!existing) return;
    const oldKeys = [
      existing.documentFrontKey,
      existing.documentBackKey,
      existing.selfieKey,
    ]
      .filter((key): key is string => key !== null)
      .filter((key) => !newKeys.includes(key));
    await Promise.allSettled(
      oldKeys.map((key) => this.storageService.deleteSensitiveDocument(key)),
    );
  }

  private toPublicVerification<
    T extends {
      documentFrontKey: string | null;
      documentBackKey: string | null;
      selfieKey: string | null;
    },
  >(verification: T) {
    const { documentFrontKey, documentBackKey, selfieKey, ...publicVerification } =
      verification;
    return {
      ...publicVerification,
      hasDocumentFront: Boolean(documentFrontKey),
      hasDocumentBack: Boolean(documentBackKey),
      hasSelfie: Boolean(selfieKey),
    };
  }
}
