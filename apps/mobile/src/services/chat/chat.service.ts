import { apiClient } from '../api/client';
import { User } from '../../types/domain';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  messageType: 'TEXT' | 'IMAGE' | 'SYSTEM';
  content: string;
  attachmentUrl?: string | null;
  createdAt: string;
  sender?: User;
}

export interface Conversation {
  id: string;
  rentalId: string;
  updatedAt: string;
  rental: {
    asset: { id: string; title: string };
  };
  members: { userId: string; user: User }[];
  messages: ChatMessage[];
}

export const ChatService = {
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
