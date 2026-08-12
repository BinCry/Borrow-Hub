import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { RequestLogsModule } from '../request-logs/request-logs.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [AuditModule, RequestLogsModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
