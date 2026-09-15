import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';

@Injectable()
export class NotificationsEventsService {
  private server: Server | null = null;

  bindServer(server: Server) {
    this.server = server;
  }

  getUserRoom(userId: string) {
    return `user:${userId}`;
  }

  emitCreated(userId: string, notification: unknown) {
    this.server
      ?.to(this.getUserRoom(userId))
      .emit('notification.created', { notification });
  }

  emitRead(userId: string, notification: unknown) {
    this.server
      ?.to(this.getUserRoom(userId))
      .emit('notification.read', { notification });
  }

  emitReadAll(userId: string) {
    this.server
      ?.to(this.getUserRoom(userId))
      .emit('notification.read_all', {});
  }
}
