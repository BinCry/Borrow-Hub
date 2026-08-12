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
    rental: {
      asset: {
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

  const chatTimelineService = {
    appendSystemMessageForRental: jest.fn(),
  };

  let service: ChatService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.conversation.findUnique.mockResolvedValue(conversation);
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
      chatTimelineService as never,
    );
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
          'Giao dịch ngoài ToolShare sẽ không được hỗ trợ bởi quy trình tranh chấp của nền tảng.',
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
    expect(result.id).toBe('message-5');
  });
});
