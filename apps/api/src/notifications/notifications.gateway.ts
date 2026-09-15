import {
  OnGatewayConnection,
  OnGatewayInit,
  WebSocketGateway,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { NotificationsEventsService } from './notifications-events.service';

type AuthenticatedSocket = Socket & {
  data: {
    user?: AuthenticatedUser;
  };
};

@WebSocketGateway({
  namespace: '/notifications',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    private readonly authService: AuthService,
    private readonly notificationsEventsService: NotificationsEventsService,
  ) {}

  afterInit(server: Server) {
    this.notificationsEventsService.bindServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractAccessToken(client);

      if (!token) {
        client.emit('notification.error', { message: 'Missing access token' });
        client.disconnect(true);
        return;
      }

      const user = await this.authService.validateAccessToken(token);
      client.data.user = user;
      client.join(this.notificationsEventsService.getUserRoom(user.id));
    } catch {
      client.emit('notification.error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  private extractAccessToken(client: AuthenticatedSocket) {
    const authToken = client.handshake.auth?.token;
    if (typeof authToken === 'string' && authToken.trim()) {
      return authToken.trim();
    }

    const authorizationHeader = client.handshake.headers.authorization;
    if (typeof authorizationHeader === 'string') {
      const [scheme, token] = authorizationHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        return token;
      }
    }

    const queryToken = client.handshake.query.token;
    if (typeof queryToken === 'string' && queryToken.trim()) {
      return queryToken.trim();
    }

    return null;
  }
}
