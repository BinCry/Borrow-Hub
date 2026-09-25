import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, PlusCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { AssetCard } from '../../components/AssetCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AssetsService } from '../../services/assets/assets.service';

export default function MyListingsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['my-assets'],
    queryFn: async () => {
      return AssetsService.listMine();
    },
    enabled: isAuthenticated,
  });
  const queryClient = useQueryClient();

  const removeListing = (id: string, title: string) => {
    Alert.alert('Xóa bài đăng?', `Bạn có chắc muốn xóa "${title}" không?`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa', style: 'destructive', onPress: async () => {
        try {
          await AssetsService.remove(id);
          await queryClient.invalidateQueries({ queryKey: ['my-assets'] });
          await queryClient.invalidateQueries({ queryKey: ['assets'] });
        } catch {
          Alert.alert('Không thể xóa bài', 'Kiểm tra kết nối và thử lại.');
        }
      } },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Quản lý bài đăng</Text>
        <TouchableOpacity onPress={() => router.push('/asset/create')} className="p-2 -mr-2">
          <PlusCircle size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : isError ? (
        <EmptyState
          title="Không thể tải bài đăng"
          description="Kiểm tra kết nối rồi thử lại để xem các tài sản bạn đang cho thuê."
          buttonText="Thử lại"
          onPress={() => void refetch()}
        />
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View>
              <AssetCard asset={item} />
              <View className="-mt-2 mb-4 flex-row gap-3">
                <TouchableOpacity
                  className="min-h-11 flex-1 items-center justify-center rounded-xl border border-primary bg-primary-soft"
                  onPress={() => router.push({ pathname: '/asset/create', params: { editId: item.id } })}
                >
                  <Text className="font-bold text-primary">Sửa bài</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="min-h-11 flex-1 items-center justify-center rounded-xl border border-danger bg-surface"
                  onPress={() => removeListing(item.id, item.title)}
                >
                  <Text className="font-bold text-danger">Xóa bài</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerClassName="p-4"
          ListEmptyComponent={
            <EmptyState 
              title="Chưa có bài đăng nào"
              description="Bạn chưa đăng cho thuê tài sản nào trên RentLoop."
              buttonText="Đăng tài sản ngay"
              onPress={() => router.push('/asset/create')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
