import { Module } from '@nestjs/common';
import { ChatEventsService } from './chat-events.service';
import { ChatTimelineService } from './chat-timeline.service';

@Module({
  providers: [ChatTimelineService, ChatEventsService],
  exports: [ChatTimelineService, ChatEventsService],
})
export class ChatTimelineModule {}
