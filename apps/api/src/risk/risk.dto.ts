import {
  RiskIncidentStatus,
  RiskLevel,
  RiskTargetType,
} from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProhibitedAssetRuleDto {
  @IsString()
  @MaxLength(120)
  keyword!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryHint?: string;
}

export class UpdateProhibitedAssetRuleDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  categoryHint?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class RiskIncidentQueryDto {
  @IsOptional()
  @IsEnum(RiskIncidentStatus)
  status?: RiskIncidentStatus;

  @IsOptional()
  @IsEnum(RiskLevel)
  level?: RiskLevel;

  @IsOptional()
  @IsEnum(RiskTargetType)
  targetType?: RiskTargetType;
}

export class UpdateRiskIncidentStatusDto {
  @IsEnum(RiskIncidentStatus)
  status!: RiskIncidentStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resolutionSummary?: string;
}
