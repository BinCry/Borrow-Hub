import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useRouter } from 'expo-router';
import { MessageCircle } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChatService } from '../../services/chat/chat.service';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { User } from '../../types/domain';

export default function MessagesScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const conversationsQuery = useQuery({
    queryKey: ['conversations'],
    queryFn: ChatService.listMine,
    enabled: isAuthenticated,
  });
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
        <MessageCircle size={48} color={colors.text.muted} />
        <Text className="mt-4 text-center text-text-secondary">
          Đăng nhập để xem tin nhắn của bạn.
        </Text>
        <TouchableOpacity
          className="mt-6 min-h-12 w-full items-center justify-center rounded-xl bg-primary"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="font-bold text-white">Đăng nhập</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const isLoading = conversationsQuery.isLoading || meQuery.isLoading;
  const hasError = conversationsQuery.isError || meQuery.isError;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-surface px-5 py-4">
        <Text className="text-2xl font-bold text-text-primary">Tin nhắn</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : hasError ? (
        <View className="flex-1 items-center justify-center px-6">
          <MessageCircle size={48} color={colors.text.muted} />
          <Text className="mt-4 text-center font-semibold text-text-primary">
            Không thể tải cuộc trò chuyện
          </Text>
          <TouchableOpacity
            className="mt-5 min-h-12 rounded-xl bg-primary px-6 items-center justify-center"
            onPress={() => {
              void conversationsQuery.refetch();
              void meQuery.refetch();
            }}
          >
            <Text className="font-bold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={conversationsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          refreshing={conversationsQuery.isRefetching}
          onRefresh={() => void conversationsQuery.refetch()}
          contentContainerStyle={{ flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center px-6">
              <MessageCircle size={48} color={colors.text.muted} />
              <Text className="mt-4 text-lg font-semibold text-text-primary">
                Chưa có cuộc trò chuyện
              </Text>
              <Text className="mt-1 text-center text-text-secondary">
                Cuộc trò chuyện sẽ xuất hiện khi bạn tạo hoặc nhận một yêu cầu thuê.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const otherUser = item.members.find(
              (member) => member.userId !== meQuery.data?.id,
            )?.user;
            const lastMessage = item.messages[item.messages.length - 1];

            return (
              <TouchableOpacity
                className="min-h-20 flex-row items-center border-b border-border bg-surface px-5 py-4"
                onPress={() => router.push(`/chat/${item.id}`)}
              >
                <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                  <Text className="text-lg font-bold text-primary">
                    {(otherUser?.fullName ?? 'B').charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View className="flex-1">
                  <View className="mb-1 flex-row justify-between">
                    <Text className="font-bold text-text-primary" numberOfLines={1}>
                      {otherUser?.fullName ?? 'Borrow Hub'}
                    </Text>
                    <Text className="text-xs text-text-muted">
                      {format(new Date(lastMessage?.createdAt ?? item.updatedAt), 'dd/MM')}
                    </Text>
                  </View>
                  <Text className="text-text-secondary" numberOfLines={1}>
                    {lastMessage?.content || `Trao đổi về ${item.rental.asset.title}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
