import { UserStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateUserStatusDto {
  @IsEnum(UserStatus)
  status!: UserStatus;
}

export class UpdateSystemConfigDto {
  @IsString()
  value!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

