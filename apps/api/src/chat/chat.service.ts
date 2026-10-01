import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { MessageType, NotificationType, Prisma, RoleName } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatEventsService } from './chat-events.service';
import { ChatTimelineService } from './chat-timeline.service';
import { conversationInclude, groupConversations, participantPairWhere } from './conversation.include';
import { ChatQueryDto, CreateConversationDto, SendMessageDto } from './chat.dto';

const OFF_PLATFORM_WARNING =
  'Giao dịch ngoài RentLoop sẽ không được hỗ trợ bởi quy trình tranh chấp của nền tảng.';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly chatEventsService: ChatEventsService,
    private readonly chatTimelineService: ChatTimelineService,
  ) {}

  async listMine(currentUser: AuthenticatedUser, query: ChatQueryDto) {
    const rental = query.rentalId
      ? await this.prisma.rentalRequest.findUnique({ where: { id: query.rentalId } })
      : null;
    if (query.rentalId && !rental) return [];
    const where: Prisma.ConversationWhereInput = {
      ...(rental ? { rental: participantPairWhere(rental) } : {}),
      ...(this.isStaff(currentUser)
        ? {}
        : {
            members: {
              some: {
                userId: currentUser.id,
              },
            },
          }),
    };

    const conversations = await this.prisma.conversation.findMany({
      where,
      include: this.conversationInclude(),
      orderBy: [{ updatedAt: 'desc' }],
    });
    return groupConversations(conversations);
  }

  async createConversation(
    currentUser: AuthenticatedUser,
    dto: CreateConversationDto,
  ) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: dto.rentalId },
      include: {
        asset: true,
      },
    });

    if (!rental) {
      throw new NotFoundException('Rental request not found');
    }

    if (
      ![rental.ownerId, rental.renterId].includes(currentUser.id) &&
      !this.isStaff(currentUser)
    ) {
      throw new ForbiddenException(
        'You cannot create a conversation for this rental',
      );
    }

    const conversation = await this.chatTimelineService.ensureConversationForRental(
      rental,
      this.isStaff(currentUser) ? currentUser.id : undefined,
    );
    return this.findAccessibleConversation(conversation.id, currentUser);
  }

  async getConversation(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    return this.findAccessibleConversation(conversationId, currentUser);
  }

  async listMessages(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    const conversation = await this.findAccessibleConversation(
      conversationId,
      currentUser,
    );

    const messages = await this.prisma.message.findMany({
      where: { conversation: { rental: participantPairWhere(conversation.rental) } },
      include: {
        conversation: { select: { rentalId: true } },
        sender: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'asc' }],
    });
    return messages.map(({ conversation: source, ...message }) => ({
      ...message,
      metadata: {
        rentalId: source.rentalId,
        ...(message.metadata && typeof message.metadata === 'object' && !Array.isArray(message.metadata)
          ? message.metadata
          : {}),
      },
    }));
  }

  async sendMessage(
    conversationId: string,
    currentUser: AuthenticatedUser,
    dto: SendMessageDto,
  ) {
    const conversation = await this.findAccessibleConversation(
      conversationId,
      currentUser,
    );

    if (this.isStaff(currentUser)) {
      await this.prisma.conversationMember.upsert({
        where: {
          conversationId_userId: {
            conversationId: conversation.id,
            userId: currentUser.id,
          },
        },
        update: {},
        create: {
          conversationId: conversation.id,
          userId: currentUser.id,
        },
      });
    }

    const messageType = dto.messageType ?? MessageType.TEXT;
    if (messageType === MessageType.SYSTEM) {
      throw new ForbiddenException('Users cannot send system messages');
    }

    const content = dto.content?.trim() ?? '';
    const attachmentUrl = dto.attachmentUrl?.trim() || null;

    if (messageType === MessageType.TEXT && !content) {
      throw new BadRequestException('Text messages require content');
    }

    if (messageType === MessageType.IMAGE && !attachmentUrl) {
      throw new BadRequestException('Image messages require attachmentUrl');
    }

    const offPlatformSignals =
      messageType === MessageType.TEXT
        ? this.detectOffPlatformSignals(content)
        : [];

    const { createdMessage, warningMessage } = await this.prisma.$transaction(
      async (tx) => {
        const createdMessage = await tx.message.create({
          data: {
            conversationId: conversation.id,
            senderId: currentUser.id,
            messageType,
            content,
            attachmentUrl,
            metadata: offPlatformSignals.length
              ? ({ offPlatformSignals } as Prisma.InputJsonValue)
              : undefined,
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

        let warningMessage: typeof createdMessage | null = null;

        if (offPlatformSignals.length > 0) {
          warningMessage = await tx.message.create({
            data: {
              conversationId: conversation.id,
              senderId: currentUser.id,
              messageType: MessageType.SYSTEM,
              content: OFF_PLATFORM_WARNING,
              metadata: {
                source: 'off_platform_detection',
                signals: offPlatformSignals,
              } as Prisma.InputJsonValue,
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
        }

        return {
          createdMessage,
          warningMessage,
        };
      },
    );

    const participantUserIds = conversation.members.map(
      (member) => member.userId,
    );

    this.chatEventsService.emitMessageCreated(
      conversation.id,
      createdMessage,
      participantUserIds,
    );

    if (warningMessage) {
      this.chatEventsService.emitMessageCreated(
        conversation.id,
        warningMessage,
        participantUserIds,
      );
    }

    await this.notificationsService.createMany(
      participantUserIds.filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tin nhắn mới',
        content: `${currentUser.fullName} vừa gửi tin nhắn cho bạn.`,
        metadata: {
          conversationId: conversation.id,
          rentalId: conversation.rentalId,
          assetId: conversation.rental.asset.id,
        },
        referenceType: 'conversation',
        referenceId: conversation.id,
      },
    );

    return createdMessage;
  }

  async appendSystemMessageForRental(
    rentalId: string,
    actorId: string,
    content: string,
  ) {
    return this.chatTimelineService.appendSystemMessageForRental(
      rentalId,
      actorId,
      content,
    );
  }

  private detectOffPlatformSignals(content: string) {
    const signals: string[] = [];

    if (/(?:\+?84|0)(?:\d[\s.-]?){8,10}/.test(content)) {
      signals.push('PHONE');
    }

    if (/\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/i.test(content)) {
      signals.push('URL');
    }

    if (/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i.test(content)) {
      signals.push('EMAIL');
    }

    return signals;
  }

  private async findAccessibleConversation(
    conversationId: string,
    currentUser: AuthenticatedUser,
  ) {
    const conversation = await this.prisma.conversation.findUnique({
      where: { id: conversationId },
      include: this.conversationInclude(),
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const memberIds = conversation.members.map((member) => member.userId);
    if (!memberIds.includes(currentUser.id) && !this.isStaff(currentUser)) {
      throw new ForbiddenException('You cannot access this conversation');
    }

    const threads = await this.prisma.conversation.findMany({
      where: { rental: participantPairWhere(conversation.rental) },
      include: this.conversationInclude(),
    });
    return groupConversations(threads)[0];
  }

  private conversationInclude() {
    return conversationInclude;
  }

  private isStaff(currentUser: AuthenticatedUser) {
    const staffRoles: RoleName[] = [
      RoleName.MODERATOR,
      RoleName.CUSTOMER_SUPPORT,
      RoleName.DISPUTE_OFFICER,
      RoleName.ADMIN,
      RoleName.SUPER_ADMIN,
    ];

    return currentUser.roles.some((role) => staffRoles.includes(role));
  }
}
