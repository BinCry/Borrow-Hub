import {
  EvidenceType,
  HandoverType,
  SignatureMethod,
} from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRentalRequestDto {
  @IsString()
  assetId!: string;

  @IsString()
  startAt!: string;

  @IsString()
  endAt!: string;

  @IsOptional()
  @IsString()
  deliveryMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;
}

export class ApproveRentalDto {
  @IsOptional()
  @IsString()
  ownerMessage?: string;
}

export class DeclineRentalDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RecordPaymentDto {
  @IsOptional()
  @IsString()
  providerTransactionId?: string;
}

export class SignContractDto {
  @IsEnum(SignatureMethod)
  signatureMethod!: SignatureMethod;

  @IsOptional()
  @IsString()
  signatureReference?: string;

  @IsOptional()
  @IsString()
  deviceInfo?: string;
}

export class HandoverItemDto {
  @IsString()
  accessoryName!: string;

  @Type(() => Number)
  @Min(0)
  expectedQuantity!: number;

  @Type(() => Number)
  @Min(0)
  actualQuantity!: number;

  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class EvidenceDto {
  @IsEnum(EvidenceType)
  type!: EvidenceType;

  @IsString()
  fileUrl!: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  fileHash?: string;
}

export class StartHandoverDto {
  @IsEnum(HandoverType)
  type!: HandoverType;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => HandoverItemDto)
  items?: HandoverItemDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EvidenceDto)
  evidences?: EvidenceDto[];
}

export class ConfirmHandoverDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReportIssueDto {
  @IsString()
  @MaxLength(1000)
  description!: string;
}

export class RentalListQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  role?: 'owner' | 'renter';
}

