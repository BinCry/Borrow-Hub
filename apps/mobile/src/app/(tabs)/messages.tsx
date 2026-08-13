import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { MessageCircle } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { format } from 'date-fns';

export default function MessagesScreen() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      // Mock API route or use real one if it exists
      // Assuming a generic chat API exists for rentals
      const response = await apiClient.get('/chat/conversations');
      return response.data;
    },
    enabled: isAuthenticated,
    retry: false, // Don't retry if endpoint missing yet
  });

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <MessageCircle size={48} color="#9CA3AF" />
        <Text className="text-text-secondary mt-4">Login to view messages</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10">
        <Text className="text-2xl font-bold text-text-primary">Messages</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F7C6B" />
        </View>
      ) : isError || !data?.data ? (
        <View className="flex-1 items-center justify-center py-20">
          <MessageCircle size={48} color="#D1D5DB" />
          <Text className="text-text-secondary mt-4 text-lg font-medium">No conversations</Text>
          <Text className="text-text-secondary text-sm mt-1">Start a rental to message owners/renters</Text>
        </View>
      ) : (
        <FlatList
          data={data.data}
          keyExtractor={(item: any) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity 
              className="px-4 py-4 border-b border-border bg-surface flex-row items-center"
              onPress={() => router.push(`/chat/${item.id}`)}
            >
              <View className="w-12 h-12 rounded-full bg-primary-soft items-center justify-center mr-3">
                <Text className="text-primary font-bold text-lg">{item.otherUser?.fullName?.charAt(0) || 'U'}</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row justify-between mb-1">
                  <Text className="font-bold text-text-primary">{item.otherUser?.fullName}</Text>
                  <Text className="text-xs text-text-secondary">
                    {item.lastMessageAt ? format(new Date(item.lastMessageAt), 'MMM dd') : ''}
                  </Text>
                </View>
                <Text className="text-text-secondary" numberOfLines={1}>
                  {item.lastMessage?.content || 'Started conversation'}
                </Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </SafeAreaView>
  );
}
