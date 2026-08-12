import { Module } from '@nestjs/common';
import { ChatTimelineService } from './chat-timeline.service';

@Module({
  providers: [ChatTimelineService],
  exports: [ChatTimelineService],
})
export class ChatTimelineModule {}
