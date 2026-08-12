import { NotificationType, RentalStatus } from '@prisma/client';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    rentalRequest: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
    favoriteAsset: {
      findMany: jest.fn(),
    },
  };

  const chatTimelineService = {
    appendSystemMessageForRental: jest.fn(),
  };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rentalRequest.findMany
      .mockResolvedValueOnce([
        {
          id: 'rental-1',
          ownerId: 'owner-1',
          renterId: 'renter-1',
          status: RentalStatus.CONFIRMED,
          asset: {
            title: 'Canon R6',
          },
        },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    prisma.favoriteAsset.findMany.mockResolvedValue([]);
    prisma.notification.findFirst.mockResolvedValue(null);
    prisma.notification.create.mockResolvedValue({ id: 'notification-1' });
    service = new NotificationsService(
      prisma as never,
      chatTimelineService as never,
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

  it('skips the timeline reminder when notifications were already deduped', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'notification-existing',
    });

    await service.runReminderJobs({
      referenceDate: '2026-08-12T00:00:00.000Z',
    });

    expect(chatTimelineService.appendSystemMessageForRental).not.toHaveBeenCalled();
  });
});
