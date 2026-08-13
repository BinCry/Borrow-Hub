import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { Asset, PaginatedResponse } from '../../types/api';
import { AssetCard } from '../../components/AssetCard';

export default function HomeScreen() {
  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['assets', 'home'],
    queryFn: async () => {
      const response = await apiClient.get<PaginatedResponse<Asset>>('/assets?limit=10');
      return response.data;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 pt-4 pb-2 border-b border-border bg-surface">
        <Text className="text-2xl font-bold text-primary">Borrow Hub</Text>
        <Text className="text-text-secondary text-sm">Find what you need, nearby</Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#4F7C6B" />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-danger">Failed to load assets.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetCard asset={item} />}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <View className="py-10 items-center justify-center">
              <Text className="text-text-secondary">No assets found right now.</Text>
            </View>
          }
          ListHeaderComponent={
            <Text className="text-xl font-semibold text-text-primary mb-4">Recommended for you</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
