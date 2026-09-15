import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ChatTimelineModule } from '../chat/chat-timeline.module';
import { NotificationsEventsService } from './notifications-events.service';
import { NotificationsGateway } from './notifications.gateway';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  imports: [AuthModule, ChatTimelineModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsEventsService,
    NotificationsGateway,
    NotificationsService,
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
