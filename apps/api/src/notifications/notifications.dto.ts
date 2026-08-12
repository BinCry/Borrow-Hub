import { IsOptional, IsString } from 'class-validator';

export class RunReminderJobsDto {
  @IsOptional()
  @IsString()
  referenceDate?: string;
}
