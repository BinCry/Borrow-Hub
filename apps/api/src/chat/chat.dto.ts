import { MessageType } from '@prisma/client';
import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateConversationDto {
  @IsString()
  rentalId!: string;
}

export class SendMessageDto {
  @IsOptional()
  @IsEnum(MessageType)
  messageType?: MessageType;

  @ValidateIf((input: SendMessageDto) => input.messageType !== MessageType.IMAGE)
  @IsString()
  @MaxLength(2000)
  content?: string;

  @ValidateIf((input: SendMessageDto) => input.messageType === MessageType.IMAGE)
  @IsString()
  @MaxLength(2000)
  attachmentUrl?: string;
}

export class ChatQueryDto {
  @IsOptional()
  @IsString()
  rentalId?: string;
}
