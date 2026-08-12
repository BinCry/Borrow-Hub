import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [AuditModule, NotificationsModule],
  controllers: [RiskController],
  providers: [RiskService],
  exports: [RiskService],
})
export class RiskModule {}
