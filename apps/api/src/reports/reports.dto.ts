import { ReportStatus, ReportTargetType } from '@prisma/client';
import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export const REPORT_MODERATION_ACTIONS = [
  'NONE',
  'WARN_REPORTED_USER',
  'SUSPEND_REPORTED_USER',
  'HIDE_ASSET',
  'HIDE_REVIEW',
  'HIDE_CHAT_MESSAGE',
] as const;

export type ReportModerationAction = (typeof REPORT_MODERATION_ACTIONS)[number];

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
  @IsIn(REPORT_MODERATION_ACTIONS)
  action?: ReportModerationAction;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  actionNote?: string;

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
