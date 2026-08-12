import { RoleName, UserStatus } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

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

export class UpdateUserRolesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RoleName, { each: true })
  roles!: RoleName[];
}

export class CreateInternalUserDto {
  @IsString()
  fullName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsEnum(RoleName, { each: true })
  roles!: RoleName[];
}
