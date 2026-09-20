import {
  NotificationType,
  RentalStatus,
  RoleName,
  UserStatus,
  VerificationStatus,
} from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    rentalRequest: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    favoriteAsset: {
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
    },
  };

  const chatTimelineService = {
    appendSystemMessageForRental: jest.fn(),
  };

  const notificationsEventsService = {
    emitCreated: jest.fn(),
    emitRead: jest.fn(),
    emitReadAll: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockReminderQueries({
      rentalsTomorrow: [
        {
          id: 'rental-1',
          ownerId: 'owner-1',
          renterId: 'renter-1',
          status: RentalStatus.CONFIRMED,
          asset: {
            title: 'Canon R6',
          },
        },
      ],
    });
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    prisma.user.findMany.mockResolvedValue([]);
    prisma.systemConfig.findUnique.mockResolvedValue({
      key: 'late_fee_rate',
      value: '10000',
    });
    service = new NotificationsService(
      prisma as never,
      chatTimelineService as never,
      notificationsEventsService as never,
    );
  });

  it('appends a rental reminder system message when a tomorrow reminder is created', async () => {
    await service.runReminderJobs({
      referenceDate: '2026-08-12T00:00:00.000Z',
    });

    expect(chatTimelineService.appendSystemMessageForRental).toHaveBeenCalledWith(
      'rental-1',
      'owner-1',
      'Rental begins tomorrow.',
      {
        dedupeWindowStart: new Date('2026-08-11T00:00:00.000Z'),
        metadata: {
          source: 'reminder_job',
          reminderType: NotificationType.RENTAL_TOMORROW,
        },
      },
    );
  });

  it('emits realtime events when notifications are created', async () => {
    prisma.notification.create.mockResolvedValueOnce({
      id: 'notification-2',
      userId: 'user-1',
      type: NotificationType.SYSTEM,
      title: 'Realtime',
      content: 'Realtime notification',
      metadata: null,
      referenceType: null,
      referenceId: null,
      readAt: null,
      createdAt: new Date('2026-08-12T00:00:00.000Z'),
      updatedAt: new Date('2026-08-12T00:00:00.000Z'),
    });

    await service.createMany(['user-1'], {
      type: NotificationType.SYSTEM,
      title: 'Realtime',
      content: 'Realtime notification',
    });

    expect(notificationsEventsService.emitCreated).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        id: 'notification-2',
        title: 'Realtime',
        body: 'Realtime notification',
      }),
    );
  });

  it('broadcasts an admin notification to every active user', async () => {
    prisma.user.findMany.mockResolvedValueOnce([
      { id: 'user-1' },
      { id: 'user-2' },
    ]);
    prisma.notification.create
      .mockResolvedValueOnce({
        id: 'notification-1',
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Bao tri he thong',
        content: 'He thong bao tri luc 22:00.',
        metadata: null,
        referenceType: 'system',
        referenceId: 'admin-1',
        readAt: null,
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
      })
      .mockResolvedValueOnce({
        id: 'notification-2',
        userId: 'user-2',
        type: NotificationType.SYSTEM,
        title: 'Bao tri he thong',
        content: 'He thong bao tri luc 22:00.',
        metadata: null,
        referenceType: 'system',
        referenceId: 'admin-1',
        readAt: null,
        createdAt: new Date('2026-08-12T00:00:00.000Z'),
      });

    const result = await service.broadcastFromAdmin(
      {
        id: 'admin-1',
        email: 'admin@example.com',
        fullName: 'Admin',
        roles: [RoleName.ADMIN],
        status: UserStatus.ACTIVE,
        verificationStatus: VerificationStatus.VERIFIED,
      },
      {
        title: ' Bao tri he thong ',
        content: ' He thong bao tri luc 22:00. ',
      },
    );

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: {
        status: UserStatus.ACTIVE,
      },
      select: {
        id: true,
      },
    });
    expect(prisma.notification.create).toHaveBeenCalledTimes(2);
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-1',
        type: NotificationType.SYSTEM,
        title: 'Bao tri he thong',
        content: 'He thong bao tri luc 22:00.',
        referenceType: 'system',
        metadata: expect.objectContaining({
          actorId: 'admin-1',
          source: 'admin_broadcast',
        }),
      }),
    });
    expect(result).toEqual(
      expect.objectContaining({
        recipientCount: 2,
      }),
    );
  });

  it('skips the timeline reminder when notifications were already deduped', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-existing',
    });

    await service.runReminderJobs({
      referenceDate: '2026-08-12T00:00:00.000Z',
    });

    expect(chatTimelineService.appendSystemMessageForRental).not.toHaveBeenCalled();
  });

  it('marks overdue rentals and accrues a configurable late fee', async () => {
    mockReminderQueries({
      overdueRentals: [
        {
          id: 'rental-2',
          ownerId: 'owner-2',
          renterId: 'renter-2',
          status: RentalStatus.ONGOING,
          endAt: new Date('2026-08-11T21:30:00.000Z'),
          lateFee: 0,
          asset: {
            title: 'Bosch Drill',
          },
        },
      ],
    });

    await service.runReminderJobs({
      referenceDate: '2026-08-12T00:00:00.000Z',
    });

    expect(prisma.rentalRequest.update).toHaveBeenCalledWith({
      where: { id: 'rental-2' },
      data: {
        status: RentalStatus.OVERDUE,
        lateFee: 30000,
      },
    });
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner-2',
        type: NotificationType.RENTAL_OVERDUE,
        content:
          'Đơn thuê "Bosch Drill" hiện đang quá hạn. Phí trễ tạm tính hiện tại là 30000 VND.',
      }),
    });
  });

  it('keeps overdue notifications without late fee text when late fee config is disabled', async () => {
    mockReminderQueries({
      overdueRentals: [
        {
          id: 'rental-3',
          ownerId: 'owner-3',
          renterId: 'renter-3',
          status: RentalStatus.OVERDUE,
          endAt: new Date('2026-08-11T23:00:00.000Z'),
          lateFee: 0,
          asset: {
            title: 'Sony A7 IV',
          },
        },
      ],
    });
    prisma.systemConfig.findUnique.mockResolvedValue({
      key: 'late_fee_rate',
      value: '0',
    });

    await service.runReminderJobs({
      referenceDate: '2026-08-12T00:00:00.000Z',
    });

    expect(prisma.rentalRequest.update).not.toHaveBeenCalled();
    expect(prisma.notification.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'owner-3',
        type: NotificationType.RENTAL_OVERDUE,
        content: 'Đơn thuê "Sony A7 IV" hiện đang quá hạn.',
      }),
    });
  });

  function mockReminderQueries({
    rentalsTomorrow = [],
    returnReminders = [],
    overdueRentals = [],
    completedRentals = [],
    weekendFavorites = [],
  }: {
    rentalsTomorrow?: Array<Record<string, unknown>>;
    returnReminders?: Array<Record<string, unknown>>;
    overdueRentals?: Array<Record<string, unknown>>;
    completedRentals?: Array<Record<string, unknown>>;
    weekendFavorites?: Array<Record<string, unknown>>;
  }) {
    prisma.rentalRequest.findMany.mockReset();
    prisma.favoriteAsset.findMany.mockReset();

    prisma.rentalRequest.findMany
      .mockResolvedValueOnce(rentalsTomorrow)
      .mockResolvedValueOnce(returnReminders)
      .mockResolvedValueOnce(overdueRentals)
      .mockResolvedValueOnce(completedRentals);
    prisma.favoriteAsset.findMany.mockResolvedValueOnce(weekendFavorites);
  }
});
