import { MessageType } from '@prisma/client';
import { ChatTimelineService } from './chat-timeline.service';

describe('ChatTimelineService', () => {
  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
    },
    conversation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    $transaction: jest.fn(),
    $queryRaw: jest.fn(),
  };

  const chatEventsService = {
    emitMessageCreated: jest.fn(),
    emitConversationCreated: jest.fn(),
  };

  let service: ChatTimelineService;

  beforeEach(() => {
    jest.resetAllMocks();
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) => callback(prisma));
    prisma.rentalRequest.findUnique.mockResolvedValue({
      id: 'rental-1',
      ownerId: 'owner-1',
      renterId: 'renter-1',
    });
    prisma.conversation.findFirst.mockResolvedValue({
      id: 'conversation-1',
      members: [{ userId: 'owner-1' }, { userId: 'renter-1' }],
    });
    service = new ChatTimelineService(
      prisma as never,
      chatEventsService as never,
    );
  });

  it('appends a rental system message to an existing conversation', async () => {
    prisma.message.create.mockResolvedValue({
      id: 'message-5',
      conversationId: 'conversation-1',
      senderId: 'owner-1',
      messageType: MessageType.SYSTEM,
      content: 'Owner approved your request.',
    });

    const result = await service.appendSystemMessageForRental(
      'rental-1',
      'owner-1',
      'Owner approved your request.',
    );

    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-1',
        senderId: 'owner-1',
        messageType: MessageType.SYSTEM,
        content: 'Owner approved your request.',
        metadata: { rentalId: 'rental-1' },
      },
      include: {
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });
    expect(chatEventsService.emitMessageCreated).toHaveBeenCalledWith(
      'conversation-1',
      expect.objectContaining({
        id: 'message-5',
      }),
      ['owner-1', 'renter-1'],
    );
    expect(result?.id).toBe('message-5');
  });

  it('creates one thread for the first event and reuses it for later events', async () => {
    prisma.conversation.findFirst.mockResolvedValueOnce(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'conversation-1',
      members: [{ userId: 'owner-1' }, { userId: 'renter-1' }],
    });

    for (const content of ['Request created.', 'Payment settled.', 'Contract signed.', 'Handover completed.']) {
      await service.appendSystemMessageForRental('rental-1', 'owner-1', content);
    }

    expect(prisma.conversation.create).toHaveBeenCalledTimes(1);
    expect(prisma.conversation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: {
        rentalId: 'rental-1',
        members: { create: [{ userId: 'owner-1' }, { userId: 'renter-1' }] },
      },
    }));
    expect(chatEventsService.emitConversationCreated).toHaveBeenCalledTimes(1);
    expect(prisma.message.create).toHaveBeenCalledTimes(4);
    for (const [args] of prisma.message.create.mock.calls) {
      expect(args.data.conversationId).toBe('conversation-1');
    }
  });

  it('reuses a thread across different rentals and reversed owner/renter roles', async () => {
    prisma.rentalRequest.findUnique.mockResolvedValueOnce({
      id: 'rental-2', ownerId: 'renter-1', renterId: 'owner-1',
    });
    await service.appendSystemMessageForRental('rental-2', 'owner-1', 'Payment settled.');
    expect(prisma.conversation.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { rental: { OR: [
        { ownerId: 'renter-1', renterId: 'owner-1' },
        { ownerId: 'owner-1', renterId: 'renter-1' },
      ] } },
    }));
    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ conversationId: 'conversation-1', metadata: { rentalId: 'rental-2' } }),
    }));
  });

  it('waits for the participant lock before looking up or creating a thread', async () => {
    let releaseLock!: () => void;
    prisma.$queryRaw.mockReturnValue(new Promise<void>((resolve) => { releaseLock = resolve; }));
    const pending = service.ensureConversationForRental({ id: 'rental-1', ownerId: 'owner-1', renterId: 'renter-1' });
    expect(prisma.conversation.findFirst).not.toHaveBeenCalled();
    expect(prisma.conversation.create).not.toHaveBeenCalled();
    releaseLock();
    await pending;
    expect(prisma.conversation.findFirst).toHaveBeenCalledTimes(1);
  });

  it('keeps lifecycle events in an already existing rental conversation', async () => {
    prisma.message.create.mockResolvedValue({ id: 'system-message' });

    for (const content of ['Request created.', 'Payment settled.', 'Contract signed.', 'Handover completed.']) {
      await service.appendSystemMessageForRental('rental-1', 'owner-1', content);
    }

    expect(prisma.conversation.create).not.toHaveBeenCalled();
    expect(prisma.message.create).toHaveBeenCalledTimes(4);
    for (const [args] of prisma.message.create.mock.calls) {
      expect(args.data.conversationId).toBe('conversation-1');
    }
  });

  it('reuses an existing reminder message inside the dedupe window', async () => {
    const existingMessage = {
      id: 'message-7',
      conversationId: 'conversation-1',
      senderId: 'owner-1',
      messageType: MessageType.SYSTEM,
      content: 'Rental begins tomorrow.',
    };
    prisma.message.findFirst.mockResolvedValue(existingMessage);

    const result = await service.appendSystemMessageForRental(
      'rental-1',
      'owner-1',
      'Rental begins tomorrow.',
      {
        dedupeWindowStart: new Date('2026-08-11T00:00:00.000Z'),
        metadata: {
          source: 'reminder_job',
        },
      },
    );

    expect(prisma.message.findFirst).toHaveBeenCalledWith({
      where: {
        conversationId: 'conversation-1',
        senderId: 'owner-1',
        messageType: MessageType.SYSTEM,
        content: 'Rental begins tomorrow.',
        metadata: { path: ['rentalId'], equals: 'rental-1' },
        createdAt: {
          gte: new Date('2026-08-11T00:00:00.000Z'),
        },
      },
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(chatEventsService.emitMessageCreated).not.toHaveBeenCalled();
    expect(result).toBe(existingMessage);
  });
});
