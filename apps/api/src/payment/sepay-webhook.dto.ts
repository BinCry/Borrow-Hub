import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class SepayWebhookDto {
  @Type(() => Number)
  @IsOptional()
  @IsInt()
  @Min(0)
  id!: number;

  @IsOptional()
  @IsString()
  gateway!: string;

  @IsOptional()
  @IsString()
  transactionDate!: string;

  @IsOptional()
  @IsString()
  accountNumber!: string;

  @IsOptional()
  @IsOptional()
  @IsString()
  subAccount?: string;

  @IsOptional()
  @IsString()
  code?: string | null;

  @IsString()
  content!: string;

  @IsOptional()
  @IsIn(['in', 'out'])
  transferType!: 'in' | 'out';

  @IsOptional()
  @IsString()
  description?: string;

  @Type(() => Number)
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 0 })
  @Min(1)
  transferAmount!: number;

  @Type(() => Number)
  @IsOptional()
  @IsNumber()
  accumulated!: number;

  @IsOptional()
  @IsString()
  referenceCode!: string;
}
