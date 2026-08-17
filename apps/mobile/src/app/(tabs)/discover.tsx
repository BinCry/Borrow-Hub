import { colors } from '../../theme/colors';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from '../../hooks/useAssets';
import { AssetCard } from '../../components/AssetCard';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';

export default function DiscoverScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearch = useDebounce(searchQuery, 500);

  const { data, isLoading, isError } = useAssets({ query: debouncedSearch });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-4 bg-surface border-b border-border z-10">
        <View className="flex-row items-center space-x-2">
          <View className="flex-1 flex-row items-center bg-background rounded-lg px-3 py-2 border border-border">
            <Search size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-base text-text-primary h-12"
              placeholder="Tìm kiếm tài sản..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity className="bg-primary-soft p-3 rounded-lg">
            <SlidersHorizontal size={20} color={colors.primary.DEFAULT} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-danger">Không thể tải dữ liệu tìm kiếm.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AssetCard asset={item} />}
          contentContainerClassName="p-4"
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <Search size={48} color="#D1D5DB" />
              <Text className="text-text-secondary mt-4 text-lg font-medium">Không tìm thấy kết quả</Text>
              <Text className="text-text-secondary text-sm mt-1">Thử thay đổi từ khoá tìm kiếm</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
