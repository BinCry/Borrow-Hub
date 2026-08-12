import { FaceMatchStatus, VerificationStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsString()
  documentType!: string;

  @IsString()
  documentNumber!: string;
}

export class KycReviewQueryDto {
  @IsOptional()
  @IsEnum(VerificationStatus)
  status?: VerificationStatus;
}

export class ReviewKycDto {
  @IsEnum(VerificationStatus)
  verificationStatus!: VerificationStatus;

  @IsOptional()
  @IsEnum(FaceMatchStatus)
  faceMatchStatus?: FaceMatchStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
