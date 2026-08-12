import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UpdateSystemConfigDto, UpdateUserStatusDto } from './admin.dto';
import { AdminService } from './admin.service';

@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers() {
    return this.adminService.listUsers();
  }

  @Patch('users/:userId/status')
  updateUserStatus(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.updateUserStatus(userId, dto, actor);
  }

  @Get('system-configs')
  listSystemConfigs() {
    return this.adminService.listSystemConfigs();
  }

  @Patch('system-configs/:key')
  updateSystemConfig(
    @Param('key') key: string,
    @Body() dto: UpdateSystemConfigDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.adminService.updateSystemConfig(key, dto, actor);
  }

  @Get('audit-logs')
  getAuditLogs() {
    return this.adminService.getAuditLogs();
  }
}

