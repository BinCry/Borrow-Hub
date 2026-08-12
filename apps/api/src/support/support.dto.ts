import {
  SupportTicketPriority,
  SupportTicketStatus,
} from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateSupportTicketDto {
  @IsString()
  @MaxLength(160)
  subject!: string;

  @IsString()
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsString()
  rentalId?: string;

  @IsOptional()
  @IsString()
  disputeId?: string;

  @IsOptional()
  @IsString()
  reportId?: string;
}

export class AssignSupportTicketDto {
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

export class UpdateSupportTicketStatusDto {
  @IsEnum(SupportTicketStatus)
  status!: SupportTicketStatus;
}

export class AddSupportTicketNoteDto {
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class SupportTicketQueryDto {
  @IsOptional()
  @IsEnum(SupportTicketStatus)
  status?: SupportTicketStatus;

  @IsOptional()
  @IsEnum(SupportTicketPriority)
  priority?: SupportTicketPriority;

  @IsOptional()
  @IsString()
  scope?: 'requested' | 'assigned' | 'all';
}
