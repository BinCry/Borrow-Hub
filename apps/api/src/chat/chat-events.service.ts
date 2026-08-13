import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class ChatEventsService {
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
  }

  getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  emitConversationCreated(
    conversation: unknown,
    participantUserIds: string[],
  ) {
    if (!this.server) {
      return;
    }

    const payload = { conversation };
    for (const userId of new Set(participantUserIds)) {
      this.server
        .to(this.getUserRoom(userId))
        .emit('chat.conversation.created', payload);
    }
  }

  emitMessageCreated(
    conversationId: string,
    message: unknown,
    participantUserIds: string[],
  ) {
    if (!this.server) {
      return;
    }

    const payload = {
      conversationId,
      message,
    };
    for (const userId of new Set(participantUserIds)) {
      this.server
        .to(this.getUserRoom(userId))
        .emit('chat.message.created', payload);
    }
  }
}
