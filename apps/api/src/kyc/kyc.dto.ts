import { IsOptional, IsString } from 'class-validator';

export class SubmitKycDto {
  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  providerReference?: string;

  @IsString()
  documentType!: string;

  @IsString()
  documentNumber!: string;
}

