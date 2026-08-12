import { DisputeStatus } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  rentalId!: string;

  @IsString()
  @MaxLength(120)
  reason!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidenceIds?: string[];
}

export class RespondDisputeDto {
  @IsString()
  @MaxLength(2000)
  content!: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  evidenceIds?: string[];
}

export class AssignDisputeDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class UpdateDisputeStatusDto {
  @IsEnum(DisputeStatus)
  status!: DisputeStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionSummary?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

export class DisputeQueryDto {
  @IsOptional()
  @IsEnum(DisputeStatus)
  status?: DisputeStatus;

  @IsOptional()
  @IsString()
  role?: 'opened' | 'assigned' | 'participant';
}
