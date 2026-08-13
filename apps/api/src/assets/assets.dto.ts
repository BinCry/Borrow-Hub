import {
  AssetCondition,
  AssetStatus,
  AvailabilityType,
} from '@prisma/client';
import {
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AssetImageDto {
  @IsString()
  url!: string;

  @IsOptional()
  @IsString()
  fileKey?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  isCover?: boolean;
}

export class AssetAccessoryDto {
  @IsString()
  name!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  description?: string;
}

export class AssetAvailabilityDto {
  @IsString()
  startAt!: string;

  @IsString()
  endAt!: string;

  @IsOptional()
  @IsEnum(AvailabilityType)
  availabilityType?: AvailabilityType;
}

export class CreateAssetDto {
  @IsString()
  categoryId!: string;

  @IsString()
  title!: string;

  @IsString()
  description!: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsEnum(AssetCondition)
  condition!: AssetCondition;

  @IsInt()
  @Min(1)
  estimatedValue!: number;

  @IsInt()
  @Min(1)
  pricePerDay!: number;

  @IsInt()
  @Min(1)
  minimumDurationDays!: number;

  @IsInt()
  @Min(1)
  maximumDurationDays!: number;

  @IsString()
  city!: string;

  @IsString()
  district!: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @IsOptional()
  deliveryOptions?: string[];

  @IsOptional()
  @IsString()
  usageInstructions?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetImageDto)
  images?: AssetImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetAccessoryDto)
  accessories?: AssetAccessoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetAvailabilityDto)
  availability?: AssetAvailabilityDto[];
}

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsInt()
  @Min(1)
  estimatedValue?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pricePerDay?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  minimumDurationDays?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maximumDurationDays?: number;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsString()
  ward?: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  meetingPoint?: string;

  @IsOptional()
  deliveryOptions?: string[];

  @IsOptional()
  @IsString()
  usageInstructions?: string;

  @IsOptional()
  @IsString()
  cancellationPolicy?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetImageDto)
  images?: AssetImageDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetAccessoryDto)
  accessories?: AssetAccessoryDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AssetAvailabilityDto)
  availability?: AssetAvailabilityDto[];
}

export class SearchAssetsQueryDto {
  @IsOptional()
  @IsString()
  keyword?: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  district?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  minPrice?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  maxPrice?: number;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  startAt?: string;

  @IsOptional()
  @IsString()
  endAt?: string;

  @IsOptional()
  @IsString()
  sort?: 'newest' | 'lowest-price' | 'highest-price';

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;
}

export class ModerateAssetDto {
  @IsEnum(AssetStatus)
  status!: AssetStatus;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reason?: string;
}
