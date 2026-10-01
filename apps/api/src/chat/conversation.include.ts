import { Prisma } from '@prisma/client';

const userSelect = { id: true, fullName: true, email: true } as const;

export const conversationInclude = {
  rental: {
    include: {
      asset: true,
      owner: { select: userSelect },
      renter: { select: userSelect },
    },
  },
  members: { include: { user: { select: userSelect } } },
  messages: {
    include: { sender: { select: userSelect } },
    orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }],
    take: 50,
  },
} satisfies Prisma.ConversationInclude;

export function participantPairWhere(pair: { ownerId: string; renterId: string }) {
  return {
    OR: [
      { ownerId: pair.ownerId, renterId: pair.renterId },
      { ownerId: pair.renterId, renterId: pair.ownerId },
    ],
  } satisfies Prisma.RentalRequestWhereInput;
}

type Conversation = Prisma.ConversationGetPayload<{ include: typeof conversationInclude }>;

// Keep old thread IDs and messages usable, but expose a single inbox per pair.
export function groupConversations(conversations: Conversation[]) {
  const groups = new Map<string, Conversation[]>();
  for (const conversation of conversations) {
    const key = JSON.stringify([conversation.rental.ownerId, conversation.rental.renterId].sort());
    groups.set(key, [...(groups.get(key) ?? []), conversation]);
  }
  return [...groups.values()].map((threads) => {
    threads.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id));
    const canonical = threads[0];
    const messages = threads.flatMap((thread) => thread.messages)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime() || a.id.localeCompare(b.id))
      .slice(-50);
    const latestTime = Math.max(
      ...threads.map((thread) => thread.updatedAt.getTime()),
      ...messages.map((message) => message.createdAt.getTime()),
    );
    return { ...canonical, messages, updatedAt: new Date(latestTime) };
  }).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
}
