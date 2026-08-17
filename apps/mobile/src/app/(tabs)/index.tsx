import { View, Text, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { AssetCard } from '../../components/AssetCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Search } from 'lucide-react-native';

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
        <Text className="text-text-secondary text-sm">Tìm món đồ bạn cần quanh đây</Text>
      </View>

      {isLoading ? (
        <View className="p-4">
          <View className="flex-row items-center mb-4">
            <Skeleton width={120} height={20} />
          </View>
          {[1, 2, 3].map((key) => (
            <View key={key} className="mb-4 bg-surface rounded-xl p-3 shadow-sm">
               <Skeleton width="100%" height={160} borderRadius={12} style={{ marginBottom: 10 }} />
               <Skeleton width="60%" height={24} style={{ marginBottom: 8 }} />
               <Skeleton width="40%" height={18} />
            </View>
          ))}
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center">
          <EmptyState 
             title="Lỗi tải dữ liệu" 
             description="Không thể tải danh sách tài sản. Vui lòng thử lại sau."
             buttonText="Thử lại"
             onPress={() => refetch()}
          />
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetCard asset={item} />}
          contentContainerClassName="p-4"
          refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
          ListEmptyComponent={
            <EmptyState 
              title="Không tìm thấy tài sản"
              description="Hiện tại không có tài sản nào đang được cho thuê."
              icon={<Search size={40} color="#9CA3AF" />}
            />
          }
          ListHeaderComponent={
            <Text className="text-xl font-semibold text-text-primary mb-4">Dành cho bạn</Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
