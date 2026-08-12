import { Injectable } from '@nestjs/common';
import { FaceMatchStatus, VerificationStatus } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { maskDocumentNumber } from '../common/utils/mask.util';
import { SubmitKycDto } from './kyc.dto';

@Injectable()
export class KycService {
  constructor(private readonly prisma: PrismaService) {}

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
}

