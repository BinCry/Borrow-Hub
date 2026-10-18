import { apiClient } from '../api/client';
import { User } from '../../types/domain';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
  content: string;
  attachmentUrl?: string | null;
  metadata?: { rentalId?: string; [key: string]: unknown } | null;
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  rentalId: string | null;
  updatedAt: string;
  rental: {
    asset: { id: string; title: string };
  } | null;
  members: { userId: string; user: User }[];
  messages: ChatMessage[];
}

export const ChatService = {
  async startConsultation(recipientId: string) {
    return (await apiClient.post<Conversation>('/chat/conversations', { recipientId })).data;
  },
  async listMine() {
    const response = await apiClient.get<Conversation[]>(
      '/chat/conversations/my',
    );
    return response.data;
  },

  async getConversation(id: string) {
    const response = await apiClient.get<Conversation>(
      `/chat/conversations/${id}`,
    );
    return response.data;
  },

  async listMessages(id: string) {
    const response = await apiClient.get<ChatMessage[]>(
      `/chat/conversations/${id}/messages`,
    );
    return response.data;
  },

  async sendMessage(id: string, content: string) {
    const response = await apiClient.post<ChatMessage>(
      `/chat/conversations/${id}/messages`,
      { messageType: 'TEXT', content },
    );
    return response.data;
  },
};
