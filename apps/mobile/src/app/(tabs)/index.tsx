import { View, Text, FlatList, RefreshControl, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from '../../hooks/useAssets';
import { AssetCard } from '../../components/AssetCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Search, Bell, SlidersHorizontal } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useAssets({ limit: 10 });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-5 pt-2 pb-4 bg-surface z-10 shadow-sm border-b border-border">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-extrabold text-primary tracking-tight">Borrow Hub</Text>
            <Text className="text-text-secondary text-sm mt-0.5">Thuê mọi thứ bạn cần quanh đây</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Mở thông báo"
            className="w-10 h-10 bg-surfaceSecondary rounded-full items-center justify-center"
            onPress={() => router.push('/notifications' as never)}
          >
            <Bell size={20} color="#4B5563" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityLabel="Tìm kiếm tài sản"
          className="flex-row items-center bg-surfaceSecondary rounded-xl px-4 py-3 border border-border"
          onPress={() => router.push('/discover')}
        >
          <Search size={20} color="#9CA3AF" />
          <Text className="text-text-muted ml-3 flex-1 text-base">Tìm kiếm thiết bị, máy ảnh...</Text>
          <SlidersHorizontal size={20} color="#4B5563" />
        </TouchableOpacity>
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
            <View className="mb-6">
              <View className="w-full h-[160px] rounded-2xl overflow-hidden mb-6 relative">
                <Image 
                  source={require('../../../assets/images/auth-background-v2.png')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  contentPosition="center"
                  priority="high"
                />
                <View className="absolute inset-0 bg-black/45 p-5 justify-end">
                  <Text className="text-white font-extrabold text-xl mb-1">Mượn đúng món, dùng đúng lúc</Text>
                  <Text className="text-white/90 text-sm font-medium">Khám phá đồ dùng hữu ích ngay trong cộng đồng</Text>
                </View>
              </View>
              
              <Text className="text-xl font-extrabold text-text-primary tracking-tight">Dành cho bạn</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
