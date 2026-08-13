import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { ChatEventsService } from './chat-events.service';

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

    const existingConversation = await this.prisma.conversation.findUnique({
      where: { rentalId: rental.id },
      select: {
        id: true,
      },
    });

    const conversationId = existingConversation
      ? existingConversation.id
      : (
          await this.prisma.conversation.create({
            data: {
              rentalId: rental.id,
              members: {
                create: [...new Set([rental.ownerId, rental.renterId])].map(
                  (userId) => ({
                    userId,
                  }),
                ),
              },
            },
            select: {
              id: true,
            },
          })
        ).id;

    if (options?.dedupeWindowStart) {
      const existingMessage = await this.prisma.message.findFirst({
        where: {
          conversationId,
          senderId: actorId,
          messageType: MessageType.SYSTEM,
          content,
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
        metadata: options?.metadata,
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

    this.chatEventsService.emitMessageCreated(conversationId, message, [
      rental.ownerId,
      rental.renterId,
    ]);

    return message;
  }
}
