import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { ChatQueryDto, CreateConversationDto, SendMessageDto } from './chat.dto';
import { ChatService } from './chat.service';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('conversations/my')
  listMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ChatQueryDto,
  ) {
    return this.chatService.listMine(currentUser, query);
  }

  @Post('conversations')
  createConversation(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateConversationDto,
  ) {
    return this.chatService.createConversation(currentUser, dto);
  }

  @Get('conversations/:conversationId')
  getConversation(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.chatService.getConversation(conversationId, currentUser);
  }

  @Get('conversations/:conversationId/messages')
  listMessages(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.chatService.listMessages(conversationId, currentUser);
  }

  @Post('conversations/:conversationId/messages')
  sendMessage(
    @Param('conversationId') conversationId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(conversationId, currentUser, dto);
  }
}
