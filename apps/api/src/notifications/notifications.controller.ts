import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
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
}

