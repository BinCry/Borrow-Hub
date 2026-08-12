import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RiskModule } from '../risk/risk.module';
import { RentalsController } from './rentals.controller';
import { RentalsService } from './rentals.service';

@Module({
  imports: [AuditModule, NotificationsModule, RiskModule],
  controllers: [RentalsController],
  providers: [RentalsService],
  exports: [RentalsService],
})
export class RentalsModule {}
