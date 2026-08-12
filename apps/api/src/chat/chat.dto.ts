import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateConversationDto {
  @IsString()
  rentalId!: string;
}

export class SendMessageDto {
  @IsString()
  @MaxLength(2000)
  content!: string;
}

export class ChatQueryDto {
  @IsOptional()
  @IsString()
  rentalId?: string;
}
