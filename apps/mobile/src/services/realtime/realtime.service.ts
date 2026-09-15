import { io, Socket } from 'socket.io-client';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
const SOCKET_TIMEOUT_MS = 8_000;

export type RealtimeChatMessagePayload = {
  conversationId: string;
  message: unknown;
};

export type RealtimeConversationPayload = {
  conversation: unknown;
};

export type RealtimeNotificationPayload = {
  notification: unknown;
};

export type RealtimeConnection = {
  chatSocket: Socket;
  notificationsSocket: Socket;
  disconnect: () => void;
};

type RealtimeHandlers = {
  onChatMessage?: (payload: RealtimeChatMessagePayload) => void;
  onConversationCreated?: (payload: RealtimeConversationPayload) => void;
  onNotificationCreated?: (payload: RealtimeNotificationPayload) => void;
  onNotificationRead?: (payload: RealtimeNotificationPayload) => void;
  onNotificationsReadAll?: () => void;
};

export function connectRealtime(
  accessToken: string,
  handlers: RealtimeHandlers,
): RealtimeConnection {
  const baseUrl = getRealtimeBaseUrl();
  const socketOptions = {
    auth: { token: accessToken },
    transports: ['websocket'],
    timeout: SOCKET_TIMEOUT_MS,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 800,
    reconnectionDelayMax: 5_000,
  };
  const chatSocket = io(`${baseUrl}/chat`, socketOptions);
  const notificationsSocket = io(`${baseUrl}/notifications`, socketOptions);

  chatSocket.on('chat.message.created', handlers.onChatMessage ?? noop);
  chatSocket.on(
    'chat.conversation.created',
    handlers.onConversationCreated ?? noop,
  );
  notificationsSocket.on(
    'notification.created',
    handlers.onNotificationCreated ?? noop,
  );
  notificationsSocket.on(
    'notification.read',
    handlers.onNotificationRead ?? noop,
  );
  notificationsSocket.on(
    'notification.read_all',
    handlers.onNotificationsReadAll ?? noop,
  );

  return {
    chatSocket,
    notificationsSocket,
    disconnect: () => {
      chatSocket.disconnect();
      notificationsSocket.disconnect();
    },
  };
}

function getRealtimeBaseUrl() {
  try {
    const parsed = new URL(API_URL);
    return parsed.origin;
  } catch {
    return API_URL.replace(/\/api\/v\d+\/?$/i, '').replace(/\/$/, '');
  }
}

function noop() {}
