import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, Send, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../services/api/client';
import { ChatService } from '../../services/chat/chat.service';
import { colors } from '../../theme/colors';
import { User } from '../../types/domain';

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const conversationQuery = useQuery({
    queryKey: ['conversations', id],
    queryFn: () => ChatService.getConversation(id),
    enabled: Boolean(id),
  });
  const messagesQuery = useQuery({
    queryKey: ['messages', id],
    queryFn: () => ChatService.listMessages(id),
    enabled: Boolean(id),
    refetchInterval: 5_000,
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const sendMutation = useMutation({
    mutationFn: (content: string) => ChatService.sendMessage(id, content),
    onSuccess: (createdMessage) => {
      queryClient.setQueryData(
        ['messages', id],
        (current: typeof messagesQuery.data) => [
          ...(current ?? []).filter((item) => item.id !== createdMessage.id),
          createdMessage,
        ],
      );
      setMessage('');
      void queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
  const conversation = conversationQuery.data;
  const otherUser = conversation?.members.find(
    (member) => member.userId !== meQuery.data?.id,
  )?.user;
  const canSend = Boolean(message.trim()) && !sendMutation.isPending;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
          <TouchableOpacity
            accessibilityLabel="Quay lại"
            className="mr-2 min-h-11 min-w-11 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <ChevronLeft size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
              {otherUser?.fullName ?? conversation?.rental.asset.title ?? 'Cuộc trò chuyện'}
            </Text>
            <View className="mt-0.5 flex-row items-center">
              <ShieldCheck size={12} color={colors.success} />
              <Text className="ml-1 text-xs text-text-secondary">
                Giao dịch được bảo vệ trên Borrow Hub
              </Text>
            </View>
          </View>
        </View>

        {messagesQuery.isLoading || conversationQuery.isLoading || meQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : messagesQuery.isError || conversationQuery.isError ? (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-center font-semibold text-danger">
              Không thể tải tin nhắn. Vui lòng thử lại.
            </Text>
          </View>
        ) : (
          <FlatList
            data={messagesQuery.data ?? []}
            keyExtractor={(item) => item.id}
            className="flex-1 px-4"
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => undefined}
            renderItem={({ item }) => {
              const isMe = item.senderId === meQuery.data?.id;
              const isSystem = item.messageType === 'SYSTEM';

              if (isSystem) {
                return (
                  <View className="mb-4 items-center px-8">
                    <Text className="text-center text-xs text-text-muted">
                      {item.content}
                    </Text>
                  </View>
                );
              }

              return (
                <View className={`mb-3 flex-row ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <View
                    className={`max-w-[78%] rounded-2xl px-4 py-3 ${
                      isMe
                        ? 'rounded-br-sm bg-primary'
                        : 'rounded-bl-sm border border-border bg-surface'
                    }`}
                  >
                    <Text className={isMe ? 'text-white' : 'text-text-primary'}>
                      {item.content}
                    </Text>
                    <Text
                      className={`mt-1 text-right text-[10px] ${
                        isMe ? 'text-white/70' : 'text-text-muted'
                      }`}
                    >
                      {format(new Date(item.createdAt), 'HH:mm')}
                    </Text>
                  </View>
                </View>
              );
            }}
          />
        )}

        <View className="flex-row items-end border-t border-border bg-surface p-3">
          <TextInput
            accessibilityLabel="Nội dung tin nhắn"
            className="mr-2 max-h-28 min-h-11 flex-1 rounded-2xl bg-surfaceSecondary px-4 py-3 text-text-primary"
            placeholder="Nhập tin nhắn..."
            placeholderTextColor={colors.text.muted}
            value={message}
            onChangeText={setMessage}
            multiline
            maxLength={2000}
          />
          <TouchableOpacity
            accessibilityLabel="Gửi tin nhắn"
            className={`h-11 w-11 items-center justify-center rounded-full ${
              canSend ? 'bg-primary' : 'bg-gray-300'
            }`}
            onPress={() => sendMutation.mutate(message.trim())}
            disabled={!canSend}
          >
            {sendMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Send size={18} color="white" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
