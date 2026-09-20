import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RunReminderJobsDto {
  @IsOptional()
  @IsString()
  referenceDate?: string;
}

export class BroadcastNotificationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  title!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  content!: string;
}
