import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { Bell, CheckCheck, ChevronLeft } from 'lucide-react-native';
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../components/ui/EmptyState';
import { apiClient } from '../services/api/client';
import { colors } from '../theme/colors';

type Notification = {
  id: string;
  type: string;
  title: string;
  content: string;
  referenceType?: string | null;
  referenceId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () =>
      (await apiClient.get<Notification[]>('/notifications')).data,
  });
  const markReadMutation = useMutation({
    mutationFn: (id: string) => apiClient.post(`/notifications/${id}/read`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });
  const markAllMutation = useMutation({
    mutationFn: () => apiClient.post('/notifications/read-all'),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  });

  const openNotification = (notification: Notification) => {
    if (!notification.readAt) {
      markReadMutation.mutate(notification.id);
    }
    if (notification.referenceType === 'rental' && notification.referenceId) {
      router.push(`/rental/${notification.referenceId}`);
    }
  };

  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((item) => !item.readAt).length;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-text-primary">Thông báo</Text>
        <TouchableOpacity
          accessibilityLabel="Đánh dấu tất cả đã đọc"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          disabled={unreadCount === 0 || markAllMutation.isPending}
          onPress={() => markAllMutation.mutate()}
        >
          {markAllMutation.isPending ? (
            <ActivityIndicator color={colors.primary.DEFAULT} />
          ) : (
            <CheckCheck
              size={23}
              color={unreadCount ? colors.primary.DEFAULT : colors.text.muted}
            />
          )}
        </TouchableOpacity>
      </View>

      {notificationsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerClassName={notifications.length ? 'py-2' : 'flex-grow'}
          onRefresh={() => notificationsQuery.refetch()}
          refreshing={notificationsQuery.isRefetching}
          ListEmptyComponent={
            <EmptyState
              icon={<Bell size={42} color={colors.text.muted} />}
              title="Chưa có thông báo"
              description="Các cập nhật về đơn thuê và tài khoản sẽ xuất hiện tại đây."
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              className={`mx-4 my-1 rounded-2xl border p-4 ${
                item.readAt
                  ? 'border-border bg-surface'
                  : 'border-primary/20 bg-primary-soft'
              }`}
              onPress={() => openNotification(item)}
            >
              <View className="flex-row items-start">
                <View
                  className={`mt-1.5 h-2.5 w-2.5 rounded-full ${
                    item.readAt ? 'bg-transparent' : 'bg-primary'
                  }`}
                />
                <View className="ml-3 flex-1">
                  <Text className="font-extrabold text-text-primary">{item.title}</Text>
                  <Text className="mt-1 leading-5 text-text-secondary">{item.content}</Text>
                  <Text className="mt-2 text-xs font-semibold text-text-muted">
                    {formatDistanceToNow(new Date(item.createdAt), {
                      addSuffix: true,
                      locale: vi,
                    })}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
