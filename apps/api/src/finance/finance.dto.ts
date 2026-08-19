import { PaymentStatus, PayoutStatus, RefundStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class PaymentQueryDto {
  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  role?: 'payer' | 'owner' | 'all';
}

export class PayoutQueryDto {
  @IsOptional()
  @IsEnum(PayoutStatus)
  status?: PayoutStatus;
}

export class RefundQueryDto {
  @IsOptional()
  @IsEnum(RefundStatus)
  status?: RefundStatus;
}

export class CreateRefundDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  amount!: number;

  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class UpdatePayoutStatusDto {
  @IsEnum(PayoutStatus)
  status!: PayoutStatus;
}

export class UpdateRefundStatusDto {
  @IsIn([RefundStatus.COMPLETED, RefundStatus.FAILED, RefundStatus.REJECTED])
  status!: RefundStatus;
}
