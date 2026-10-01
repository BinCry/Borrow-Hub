import { View, Text, FlatList, RefreshControl, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from '../../hooks/useAssets';
import { AssetCard } from '../../components/AssetCard';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { Search, Bell, SlidersHorizontal } from 'lucide-react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

export default function HomeScreen() {
  const router = useRouter();
  const { data, isLoading, isError, refetch, isRefetching } = useAssets({ limit: 10 });
  const notificationsQuery = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => (await apiClient.get<{ readAt?: string | null }[]>('/notifications')).data,
    refetchInterval: 30_000,
  });
  const unreadCount = (notificationsQuery.data ?? []).filter((item) => !item.readAt).length;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Image
        source={require('../../../assets/images/borrow-auth-mint-leaves.webp')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top"
        transition={220}
        priority="high"
        accessible={false}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          'rgba(240,253,244,0.02)',
          'rgba(240,253,244,0.12)',
          'rgba(240,253,244,0.20)',
        ]}
        locations={[0, 0.48, 0.82]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View className="px-5 pt-2 pb-4 bg-primary-soft/90 z-10 border-b border-primary/15">
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-2xl font-extrabold text-primary-dark tracking-tight">RentLoop</Text>
            <Text className="text-primary-dark text-sm mt-0.5">Thuê mọi thứ bạn cần quanh đây</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Mở thông báo"
            className="w-10 h-10 bg-white/80 border border-primary/15 rounded-full items-center justify-center"
            onPress={() => router.push('/notifications' as never)}
          >
            <View>
              <Bell size={20} color={colors.primary.dark} />
              {unreadCount > 0 ? (
                <View className="absolute -right-3 -top-3 min-h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1">
                  <Text className="text-[10px] font-extrabold text-white">{unreadCount > 99 ? '99+' : unreadCount}</Text>
                </View>
              ) : null}
            </View>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          accessibilityLabel="Tìm kiếm tài sản"
          className="flex-row items-center bg-white/90 rounded-xl px-4 py-3 border border-primary/20"
          onPress={() => router.push('/discover')}
        >
          <Search size={20} color={colors.primary.DEFAULT} />
          <Text className="text-text-secondary ml-3 flex-1 text-base">Tìm kiếm thiết bị, máy ảnh...</Text>
          <SlidersHorizontal size={20} color={colors.primary.dark} />
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
                  source={require('../../../assets/images/borrow-home-lifestyle-v2.webp')}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                  contentPosition="center"
                  priority="high"
                  accessible={false}
                />
                <LinearGradient
                  colors={['rgba(12,35,25,0.08)', 'rgba(12,35,25,0.82)']}
                  locations={[0.15, 1]}
                  style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
                  pointerEvents="none"
                />
                <View className="absolute inset-0 p-5 justify-end">
                  <Text className="text-white font-extrabold text-xl mb-1">Thuê dễ dàng, dùng thông minh</Text>
                  <Text className="text-white/90 text-sm font-medium">Đừng quên trả đồ đúng hạn nhé!  </Text>
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
