import { MessageType } from '@prisma/client';
import { ChatTimelineService } from './chat-timeline.service';

describe('ChatTimelineService', () => {
  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  let service: ChatTimelineService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.rentalRequest.findUnique.mockResolvedValue({
      id: 'rental-1',
      ownerId: 'owner-1',
      renterId: 'renter-1',
    });
    prisma.conversation.findUnique.mockResolvedValue({
      id: 'conversation-1',
    });
    service = new ChatTimelineService(prisma as never);
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
        metadata: undefined,
      },
    });
    expect(result.id).toBe('message-5');
  });

  it('creates a conversation before appending a rental system message when needed', async () => {
    prisma.conversation.findUnique.mockResolvedValueOnce(null);
    prisma.conversation.create.mockResolvedValue({
      id: 'conversation-2',
    });
    prisma.message.create.mockResolvedValue({
      id: 'message-6',
      conversationId: 'conversation-2',
      senderId: 'owner-1',
      messageType: MessageType.SYSTEM,
      content: 'Contract signed.',
    });

    await service.appendSystemMessageForRental(
      'rental-1',
      'owner-1',
      'Contract signed.',
    );

    expect(prisma.conversation.create).toHaveBeenCalledWith({
      data: {
        rentalId: 'rental-1',
        members: {
          create: [{ userId: 'owner-1' }, { userId: 'renter-1' }],
        },
      },
      select: {
        id: true,
      },
    });
    expect(prisma.message.create).toHaveBeenCalledWith({
      data: {
        conversationId: 'conversation-2',
        senderId: 'owner-1',
        messageType: MessageType.SYSTEM,
        content: 'Contract signed.',
        metadata: undefined,
      },
    });
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
        createdAt: {
          gte: new Date('2026-08-11T00:00:00.000Z'),
        },
      },
    });
    expect(prisma.message.create).not.toHaveBeenCalled();
    expect(result).toBe(existingMessage);
  });
});
