import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [SupportController],
  providers: [SupportService],
})
export class SupportModule {}
