import { ReportStatus, ReportTargetType } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsEnum(ReportTargetType)
  targetType!: ReportTargetType;

  @IsString()
  targetId!: string;

  @IsString()
  @MaxLength(120)
  reason!: string;

  @IsString()
  @MaxLength(2000)
  description!: string;
}

export class AssignReportDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class UpdateReportStatusDto {
  @IsEnum(ReportStatus)
  status!: ReportStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  resolutionSummary?: string;
}

export class ReportQueryDto {
  @IsOptional()
  @IsEnum(ReportStatus)
  status?: ReportStatus;

  @IsOptional()
  @IsString()
  role?: 'reported' | 'assigned' | 'all';
}
