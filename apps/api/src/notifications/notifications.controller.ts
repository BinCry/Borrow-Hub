import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { RunReminderJobsDto } from './notifications.dto';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.findForUser(currentUser.id);
  }

  @Post(':notificationId/read')
  markAsRead(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('notificationId') notificationId: string,
  ) {
    return this.notificationsService.markAsRead(currentUser.id, notificationId);
  }

  @Post('read-all')
  markAllAsRead(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.notificationsService.markAllAsRead(currentUser.id);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post('admin/run-reminders')
  runReminderJobs(@Body() dto: RunReminderJobsDto) {
    return this.notificationsService.runReminderJobs(dto);
  }
}
