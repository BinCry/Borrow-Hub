import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessageType, RoleName } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  const renterUser: AuthenticatedUser = {
    id: 'user-1',
    email: 'user@example.com',
    fullName: 'User One',
    roles: [],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const staffUser: AuthenticatedUser = {
    id: 'staff-1',
    email: 'staff@example.com',
    fullName: 'Staff User',
    roles: [RoleName.CUSTOMER_SUPPORT],
    status: 'ACTIVE',
    verificationStatus: 'VERIFIED',
  };

  const conversation = {
    id: 'conversation-1',
    rentalId: 'rental-1',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    messages: [],
    rental: {
      ownerId: 'owner-1',
      renterId: 'user-1',
      asset: {
        id: 'asset-1',
        title: 'Canon R6',
      },
    },
    members: [{ userId: 'user-1' }, { userId: 'owner-1' }],
  };

  const prisma = {
    rentalRequest: {
      findUnique: jest.fn(),
    },
    conversation: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
    conversationMember: {
      upsert: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const notificationsService = {
    createMany: jest.fn(),
  };

  const chatEventsService = {
    emitConversationCreated: jest.fn(),
    emitMessageCreated: jest.fn(),
  };

  const chatTimelineService = {
    appendSystemMessageForRental: jest.fn(),
    ensureConversationForRental: jest.fn(),
  };

  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.conversation.findUnique.mockResolvedValue(conversation);
    prisma.conversation.findMany.mockResolvedValue([conversation]);
    prisma.rentalRequest.findUnique.mockResolvedValue({
      id: 'rental-1',
      ownerId: 'owner-1',
      renterId: renterUser.id,
    });
    prisma.$transaction.mockImplementation(async (callback: (tx: typeof prisma) => unknown) =>
      callback(prisma),
    );
    service = new ChatService(
      prisma as never,
      notificationsService as never,
      chatEventsService as never,
      chatTimelineService as never,
    );
  });

  it('uses the same conversation resolver as lifecycle events when opening chat', async () => {
    chatTimelineService.ensureConversationForRental.mockResolvedValue(conversation);
    await expect(service.createConversation(renterUser, { rentalId: 'rental-1' }))
      .resolves.toEqual(conversation);
    expect(chatTimelineService.ensureConversationForRental).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'rental-1', ownerId: 'owner-1', renterId: renterUser.id }),
      undefined,
    );
    expect(prisma.conversation.create).not.toHaveBeenCalled();
  });

  it('does not let an unrelated user create or reuse a rental conversation', async () => {
    await expect(service.createConversation({ ...renterUser, id: 'stranger' }, { rentalId: 'rental-1' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(chatTimelineService.ensureConversationForRental).not.toHaveBeenCalled();
  });

  it('groups legacy threads for one pair while keeping a different pair separate', async () => {
    const olderMessage = { id: 'message-old', content: 'Old rental', createdAt: new Date('2026-01-02') };
    const newerMessage = { id: 'message-new', content: 'New rental', createdAt: new Date('2026-03-02') };
    prisma.conversation.findMany.mockResolvedValue([
      { ...conversation, messages: [olderMessage] },
      { ...conversation, id: 'conversation-2', rentalId: 'rental-2',
        createdAt: new Date('2026-02-01'), messages: [newerMessage],
        rental: { ...conversation.rental, ownerId: 'user-1', renterId: 'owner-1' } },
      { ...conversation, id: 'conversation-other', rentalId: 'rental-other',
        rental: { ...conversation.rental, ownerId: 'owner-2' } },
    ]);

    const result = await service.listMine(renterUser, {});
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('conversation-1');
    expect(result[0].messages).toEqual([olderMessage, newerMessage]);
    expect(result[1].id).toBe('conversation-other');
    expect(prisma.conversation.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { members: { some: { userId: renterUser.id } } },
    }));
  });

  it('opens an old duplicate ID as the canonical thread and keeps the original rental references', async () => {
    const legacy = { ...conversation, id: 'legacy-thread', rentalId: 'rental-2', createdAt: new Date('2026-02-01') };
    prisma.conversation.findUnique.mockResolvedValueOnce(legacy);
    prisma.conversation.findMany.mockResolvedValue([legacy, conversation]);
    expect((await service.getConversation(legacy.id, renterUser)).id).toBe(conversation.id);

    prisma.message.findMany.mockResolvedValue([
      { id: 'old-event', metadata: null, conversation: { rentalId: 'rental-2' } },
      { id: 'new-event', metadata: { rentalId: 'rental-3' }, conversation: { rentalId: 'rental-1' } },
    ]);
    const messages = await service.listMessages(conversation.id, renterUser);
    expect(messages.map((message) => message.metadata.rentalId)).toEqual(['rental-2', 'rental-3']);
    expect(prisma.message.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { conversation: { rental: { OR: [
        { ownerId: 'owner-1', renterId: 'user-1' },
        { ownerId: 'user-1', renterId: 'owner-1' },
      ] } } },
    }));
  });

  it('rejects unrelated readers before querying shared history', async () => {
    await expect(service.listMessages(conversation.id, { ...renterUser, id: 'stranger' }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.conversation.findMany).not.toHaveBeenCalled();
    expect(prisma.message.findMany).not.toHaveBeenCalled();
  });

  it('creates an image message when attachmentUrl is provided', async () => {
    prisma.message.create.mockResolvedValueOnce({
      id: 'message-1',
      conversationId: conversation.id,
      senderId: renterUser.id,
      messageType: MessageType.IMAGE,
      content: 'Ảnh hiện trạng',
      attachmentUrl: 'https://cdn.example.com/evidence.jpg',
      sender: {
        id: renterUser.id,
        fullName: renterUser.fullName,
        email: renterUser.email,
      },
    });

    const result = await service.sendMessage(conversation.id, renterUser, {
      messageType: MessageType.IMAGE,
      content: 'Ảnh hiện trạng',
      attachmentUrl: 'https://cdn.example.com/evidence.jpg',
    });

    expect(prisma.message.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          messageType: MessageType.IMAGE,
          attachmentUrl: 'https://cdn.example.com/evidence.jpg',
        }),
      }),
    );
    expect(chatEventsService.emitMessageCreated).toHaveBeenCalledWith(
      conversation.id,
      expect.objectContaining({
        id: 'message-1',
      }),
      ['user-1', 'owner-1'],
    );
    expect(result.messageType).toBe(MessageType.IMAGE);
  });

  it('adds a system warning when off-platform signals are detected', async () => {
    prisma.message.create
      .mockResolvedValueOnce({
        id: 'message-2',
        conversationId: conversation.id,
        senderId: renterUser.id,
        messageType: MessageType.TEXT,
        content: 'Liên hệ mình qua 0912345678 hoặc abc@example.com',
        sender: {
          id: renterUser.id,
          fullName: renterUser.fullName,
          email: renterUser.email,
        },
      })
      .mockResolvedValueOnce({
        id: 'message-3',
        conversationId: conversation.id,
        senderId: renterUser.id,
        messageType: MessageType.SYSTEM,
        content:
          'Giao dịch ngoài RentLoop sẽ không được hỗ trợ bởi quy trình tranh chấp của nền tảng.',
      });

    await service.sendMessage(conversation.id, renterUser, {
      content: 'Liên hệ mình qua 0912345678 hoặc abc@example.com',
    });

    expect(prisma.message.create).toHaveBeenCalledTimes(2);
    expect(prisma.message.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        data: expect.objectContaining({
          messageType: MessageType.SYSTEM,
        }),
      }),
    );
    expect(chatEventsService.emitMessageCreated).toHaveBeenCalledTimes(2);
  });

  it('rejects image messages without attachmentUrl', async () => {
    await expect(
      service.sendMessage(conversation.id, renterUser, {
        messageType: MessageType.IMAGE,
        content: 'Ảnh hiện trạng',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects user-authored system messages', async () => {
    await expect(
      service.sendMessage(conversation.id, renterUser, {
        messageType: MessageType.SYSTEM,
        content: 'system',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('adds staff members to a conversation before sending', async () => {
    prisma.message.create.mockResolvedValueOnce({
      id: 'message-4',
      conversationId: conversation.id,
      senderId: staffUser.id,
      messageType: MessageType.TEXT,
      content: 'Support update',
      sender: {
        id: staffUser.id,
        fullName: staffUser.fullName,
        email: staffUser.email,
      },
    });

    await service.sendMessage(conversation.id, staffUser, {
      content: 'Support update',
    });

    expect(prisma.conversationMember.upsert).toHaveBeenCalled();
  });

  it('delegates rental system messages to the timeline service', async () => {
    chatTimelineService.appendSystemMessageForRental.mockResolvedValue({
      id: 'message-5',
      conversationId: conversation.id,
      senderId: 'owner-1',
      messageType: MessageType.SYSTEM,
      content: 'Owner approved your request.',
    });

    const result = await service.appendSystemMessageForRental(
      'rental-1',
      'owner-1',
      'Owner approved your request.',
    );

    expect(chatTimelineService.appendSystemMessageForRental).toHaveBeenCalledWith(
      'rental-1',
      'owner-1',
      'Owner approved your request.',
    );
    expect(result?.id).toBe('message-5');
  });
});
