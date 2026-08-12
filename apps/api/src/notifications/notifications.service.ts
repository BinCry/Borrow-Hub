import { ForbiddenException, Injectable } from '@nestjs/common';
import { Notification, NotificationType } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type NotificationPayload = {
  type: NotificationType;
  title: string;
  content: string;
  referenceType?: string;
  referenceId?: string;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createMany(
    userIds: string[],
    payload: NotificationPayload,
  ): Promise<void> {
    if (userIds.length === 0) {
      return;
    }

    await this.prisma.notification.createMany({
      data: userIds.map((userId) => ({
        userId,
        ...payload,
      })),
    });
  }

  findForUser(userId: string): Promise<Notification[]> {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(userId: string, notificationId: string): Promise<Notification> {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== userId) {
      throw new ForbiddenException('Notification not found');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: string): Promise<{ count: number }> {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null,
      },
      data: {
        readAt: new Date(),
      },
    });

    return { count: result.count };
  }
}

