import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ChatEventsService } from './chat-events.service';
import { conversationInclude, participantPairWhere } from './conversation.include';

type AppendRentalSystemMessageOptions = {
  dedupeWindowStart?: Date;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class ChatTimelineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly chatEventsService: ChatEventsService,
  ) {}

  async ensureConversationForRental(
    rental: { id: string; ownerId: string; renterId: string },
    staffId?: string,
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      // All chat creation paths lock participants in the same order, including
      // different rentals and reversed owner/renter roles for the same pair.
      await tx.$queryRaw`SELECT id FROM "User" WHERE id IN (${rental.ownerId}, ${rental.renterId}) ORDER BY id FOR UPDATE`;
      const existing = await tx.conversation.findFirst({
        where: { rental: participantPairWhere(rental) },
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        include: conversationInclude,
      });
      if (existing) return { conversation: existing, created: false };

      const conversation = await tx.conversation.create({
        data: {
          rentalId: rental.id,
          members: {
            create: [...new Set([
              rental.ownerId,
              rental.renterId,
              ...(staffId ? [staffId] : []),
            ])].map((userId) => ({ userId })),
          },
        },
        include: conversationInclude,
      });
      return { conversation, created: true };
    });
    if (result.created) {
      this.chatEventsService.emitConversationCreated(
        result.conversation,
        result.conversation.members.map((member) => member.userId),
      );
    }
    return result.conversation;
  }
  async appendSystemMessageForRental(
    rentalId: string,
    actorId: string,
    content: string,
    options?: AppendRentalSystemMessageOptions,
  ) {
    const rental = await this.prisma.rentalRequest.findUnique({
      where: { id: rentalId },
      select: {
        id: true,
        ownerId: true,
        renterId: true,
      },
    });

    if (!rental) {
      throw new NotFoundException('Rental request not found');
    }

    const conversation = await this.ensureConversationForRental(rental);
    const conversationId = conversation.id;

    if (options?.dedupeWindowStart) {
      const existingMessage = await this.prisma.message.findFirst({
        where: {
          conversationId,
          senderId: actorId,
          messageType: MessageType.SYSTEM,
          content,
          metadata: { path: ['rentalId'], equals: rental.id },
          createdAt: {
            gte: options.dedupeWindowStart,
          },
        },
      });

      if (existingMessage) {
        return existingMessage;
      }
    }

    const message = await this.prisma.message.create({
      data: {
        conversationId,
        senderId: actorId,
        messageType: MessageType.SYSTEM,
        content,
        metadata: {
          ...(options?.metadata && typeof options.metadata === 'object' && !Array.isArray(options.metadata)
            ? options.metadata
            : {}),
          rentalId: rental.id,
        },
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

    this.chatEventsService.emitMessageCreated(
      conversationId,
      message,
      conversation.members.map((member) => member.userId),
    );

    return message;
  }
}
