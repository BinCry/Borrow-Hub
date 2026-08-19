import { View, Text, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, PlusCircle } from 'lucide-react-native';
import { colors } from '../../theme/colors';
import { useAuthStore } from '../../store/authStore';
import { AssetCard } from '../../components/AssetCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useQuery } from '@tanstack/react-query';
import { AssetsService } from '../../services/assets/assets.service';

export default function MyListingsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  const { data, isLoading } = useQuery({
    queryKey: ['my-assets'],
    queryFn: async () => {
      return AssetsService.listMine();
    },
    enabled: isAuthenticated,
  });

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
      ) : (
        <FlatList
          data={data ?? []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetCard asset={item} />}
          contentContainerClassName="p-4"
          ListEmptyComponent={
            <EmptyState 
              title="Chưa có bài đăng nào"
              description="Bạn chưa đăng cho thuê tài sản nào trên Borrow Hub."
              buttonText="Đăng tài sản ngay"
              onPress={() => router.push('/asset/create')}
            />
          }
        />
      )}
    </SafeAreaView>
  );
}
