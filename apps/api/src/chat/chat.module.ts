import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { ChatTimelineModule } from './chat-timeline.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

@Module({
  imports: [NotificationsModule, ChatTimelineModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
