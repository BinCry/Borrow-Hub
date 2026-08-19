import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
} from '@nestjs/websockets';
import { UsePipes, ValidationPipe } from '@nestjs/common';
import type { Server, Socket } from 'socket.io';
import { AuthService } from '../auth/auth.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { ChatEventsService } from './chat-events.service';
import { ChatService } from './chat.service';
import { SendSocketMessageDto } from './chat.dto';

type AuthenticatedSocket = Socket & {
  data: {
    user?: AuthenticatedUser;
  };
};

@WebSocketGateway({
  namespace: '/chat',
  cors: {
    origin: true,
    credentials: true,
  },
})
export class ChatGateway implements OnGatewayInit, OnGatewayConnection {
  constructor(
    private readonly authService: AuthService,
    private readonly chatService: ChatService,
    private readonly chatEventsService: ChatEventsService,
  ) {}

  afterInit(server: Server) {
    this.chatEventsService.bindServer(server);
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractAccessToken(client);

      if (!token) {
        client.emit('chat.error', { message: 'Missing access token' });
        client.disconnect(true);
        return;
      }

      const user = await this.authService.validateAccessToken(token);
      client.data.user = user;
      client.join(this.chatEventsService.getUserRoom(user.id));
    } catch {
      client.emit('chat.error', { message: 'Unauthorized' });
      client.disconnect(true);
    }
  }

  @SubscribeMessage('chat.send_message')
  @UsePipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  async sendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() dto: SendSocketMessageDto,
  ) {
    const user = client.data.user;

    if (!user) {
      client.emit('chat.error', { message: 'Unauthorized' });
      client.disconnect(true);
      return null;
    }

    return this.chatService.sendMessage(dto.conversationId, user, dto);
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
