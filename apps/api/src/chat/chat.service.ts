import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, Prisma, RoleName } from '@prisma/client';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ChatQueryDto, CreateConversationDto, SendMessageDto } from './chat.dto';

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async listMine(currentUser: AuthenticatedUser, query: ChatQueryDto) {
    const where: Prisma.ConversationWhereInput = {
      ...(query.rentalId ? { rentalId: query.rentalId } : {}),
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

    return this.prisma.conversation.findMany({
      where,
      include: this.conversationInclude(),
      orderBy: [{ updatedAt: 'desc' }],
    });
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

    const existing = await this.prisma.conversation.findUnique({
      where: { rentalId: rental.id },
      include: this.conversationInclude(),
    });

    if (existing) {
      return existing;
    }

    return this.prisma.conversation.create({
      data: {
        rentalId: rental.id,
        members: {
          create: [
            { userId: rental.ownerId },
            { userId: rental.renterId },
            ...([rental.ownerId, rental.renterId].includes(currentUser.id)
              ? []
              : [{ userId: currentUser.id }]),
          ],
        },
        messages: {
          create: {
            senderId: currentUser.id,
            messageType: 'SYSTEM',
            content: `Conversation created for rental "${rental.asset.title}"`,
          },
        },
      },
      include: this.conversationInclude(),
    });
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

    return this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      include: {
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

    const message = await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: currentUser.id,
        content: dto.content,
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

    await this.notificationsService.createMany(
      conversation.members
        .map((member) => member.userId)
        .filter((userId) => userId !== currentUser.id),
      {
        type: NotificationType.SYSTEM,
        title: 'Tin nhắn mới',
        content: `${currentUser.fullName} vừa gửi tin nhắn trong cuộc trao đổi cho đơn "${conversation.rental.asset.title}".`,
        referenceType: 'conversation',
        referenceId: conversation.id,
      },
    );

    return message;
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

    return conversation;
  }

  private conversationInclude() {
    return {
      rental: {
        include: {
          asset: true,
          owner: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          renter: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      messages: {
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
        orderBy: [{ createdAt: 'asc' as const }],
        take: 50,
      },
    } satisfies Prisma.ConversationInclude;
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
