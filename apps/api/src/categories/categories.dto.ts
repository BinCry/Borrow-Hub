import { CategoryStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateCategoryDto {
  @IsOptional()
  @IsString()
  parentId?: string;

  @IsString()
  name!: string;

  @IsString()
  slug!: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

export class UpdateCategoryDto {
  @IsOptional()
  @IsString()
  parentId?: string | null;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsOptional()
  @IsEnum(CategoryStatus)
  status?: CategoryStatus;
}

