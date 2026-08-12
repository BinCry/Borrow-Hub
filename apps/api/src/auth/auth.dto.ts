import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  fullName!: string;

  @IsString()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class LoginDto {
  @IsString()
  identifier!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}

