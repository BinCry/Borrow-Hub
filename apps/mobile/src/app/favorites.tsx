import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Alert, FlatList, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, Heart, Trash2 } from 'lucide-react-native';
import { AssetCard } from '../components/AssetCard';
import { EmptyState } from '../components/ui/EmptyState';
import { FavoritesService } from '../services/favorites/favorites.service';
import { colors } from '../theme/colors';

export default function FavoritesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const favoritesQuery = useQuery({ queryKey: ['favorites'], queryFn: FavoritesService.list });

  const removeFavorite = async (assetId: string) => {
    try {
      await FavoritesService.remove(assetId);
      await queryClient.invalidateQueries({ queryKey: ['favorites'] });
      await queryClient.invalidateQueries({ queryKey: ['assets'] });
    } catch {
      Alert.alert('Không thể bỏ yêu thích', 'Vui lòng thử lại sau.');
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity accessibilityLabel="Quay lại" className="mr-3 p-1" onPress={() => router.back()}>
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Heart size={21} color={colors.danger} fill={colors.danger} />
        <Text className="ml-2 text-lg font-bold text-text-primary">Yêu thích</Text>
      </View>
      {favoritesQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary.DEFAULT} /></View>
      ) : favoritesQuery.isError ? (
        <EmptyState title="Không thể tải danh sách" description="Vui lòng thử lại sau." buttonText="Thử lại" onPress={() => void favoritesQuery.refetch()} />
      ) : (
        <FlatList
          data={favoritesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          renderItem={({ item }) => (
            <View>
              <AssetCard asset={item} />
              <TouchableOpacity className="-mt-2 mb-4 min-h-11 flex-row items-center justify-center rounded-xl border border-danger bg-surface" onPress={() => void removeFavorite(item.id)}>
                <Trash2 size={16} color={colors.danger} />
                <Text className="ml-2 font-bold text-danger">Bỏ yêu thích</Text>
              </TouchableOpacity>
            </View>
          )}
          ListEmptyComponent={<EmptyState title="Chưa có sản phẩm yêu thích" description="Chạm vào biểu tượng trái tim ở trang chi tiết để lưu sản phẩm." buttonText="Khám phá ngay" onPress={() => router.replace('/(tabs)/discover' as never)} icon={<Heart size={40} color={colors.danger} />} />}
        />
      )}
    </SafeAreaView>
  );
}
