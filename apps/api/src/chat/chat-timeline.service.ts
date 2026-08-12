import { Injectable, NotFoundException } from '@nestjs/common';
import { MessageType, Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type AppendRentalSystemMessageOptions = {
  dedupeWindowStart?: Date;
  metadata?: Prisma.InputJsonValue;
};

@Injectable()
export class ChatTimelineService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.prisma.message.create({
      data: {
        conversationId,
        senderId: actorId,
        messageType: MessageType.SYSTEM,
        content,
        metadata: options?.metadata,
      },
    });
  }
}
