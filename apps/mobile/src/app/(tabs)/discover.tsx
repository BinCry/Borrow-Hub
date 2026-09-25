import { colors } from '../../theme/colors';
import { View, Text, FlatList, ActivityIndicator, TextInput, TouchableOpacity, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAssets } from '../../hooks/useAssets';
import type { AssetCondition, DeliveryMethod } from '../../types/domain';
import { AssetCard } from '../../components/AssetCard';
import { Search, SlidersHorizontal } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useDebounce } from '../../hooks/useDebounce';
import { useFocusEffect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { vietnamLocations } from '../../data/vietnamLocations';
import type { AssetSearchFilters } from '../../services/assets/assets.service';

type FilterDraft = {
  categoryId: string;
  condition: AssetCondition | '';
  city: string;
  district: string;
  deliveryMethod: DeliveryMethod | '';
  minPrice: string;
  maxPrice: string;
  sort: NonNullable<AssetSearchFilters['sort']>;
};

type Category = { id: string; name: string; children?: Category[] };

const conditionOptions: { value: AssetCondition; label: string }[] = [
  { value: 'NEW', label: 'Mới' },
  { value: 'LIKE_NEW', label: 'Như mới' },
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Khá' },
  { value: 'WORN', label: 'Đã qua sử dụng' },
];

const deliveryOptions: { value: DeliveryMethod; label: string }[] = [
  { value: 'PICKUP', label: 'Nhận trực tiếp' },
  { value: 'DELIVERY', label: 'Có giao hàng' },
  { value: 'BOTH', label: 'Cả hai hình thức' },
];

const sortOptions: { value: NonNullable<AssetSearchFilters['sort']>; label: string }[] = [
  { value: 'newest', label: 'Mới đăng' },
  { value: 'lowest-price', label: 'Giá thấp đến cao' },
  { value: 'highest-price', label: 'Giá cao đến thấp' },
  { value: 'highest-rating', label: 'Đánh giá cao' },
  { value: 'most-rented', label: 'Được thuê nhiều' },
];

const emptyFilters: FilterDraft = {
  categoryId: '', condition: '', city: '', district: '', deliveryMethod: '',
  minPrice: '', maxPrice: '', sort: 'newest',
};

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [category, ...flattenCategories(category.children ?? [])]);
}

export function DiscoverContent({ adminPreview = false }: { adminPreview?: boolean }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterVisible, setFilterVisible] = useState(false);
  const [filters, setFilters] = useState<FilterDraft>(emptyFilters);
  const debouncedSearch = useDebounce(searchQuery, 500);
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => flattenCategories((await apiClient.get<Category[]>('/categories')).data),
  });

  const appliedFilters = useMemo(() => ({
    keyword: debouncedSearch.trim() || undefined,
    categoryId: filters.categoryId || undefined,
    condition: filters.condition || undefined,
    city: filters.city || undefined,
    district: filters.district || undefined,
    deliveryMethod: filters.deliveryMethod || undefined,
    minPrice: filters.minPrice ? Number(filters.minPrice) : undefined,
    maxPrice: filters.maxPrice ? Number(filters.maxPrice) : undefined,
    sort: filters.sort,
  }), [debouncedSearch, filters]);

  const { data, isLoading, isError, isRefetching, refetch } = useAssets(appliedFilters);

  useFocusEffect(
    useCallback(() => {
      if (adminPreview) {
        void refetch();
      }
    }, [adminPreview, refetch]),
  );

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="px-4 py-3 bg-surface border-b border-border z-10">
        <View className="flex-row items-center">
          <View className="mr-3 h-14 min-w-0 flex-1 flex-row items-center rounded-xl border border-border bg-background px-3">
            <Search size={20} color="#9CA3AF" />
            <TextInput
              className="flex-1 ml-2 text-base text-text-primary h-12"
              placeholder="Tìm kiếm tài sản..."
              placeholderTextColor={colors.text.muted}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
          </View>
          <TouchableOpacity
            accessibilityLabel="Bộ lọc"
            className="h-12 w-12 items-center justify-center rounded-xl border border-border bg-primary-soft"
            onPress={() => setFilterVisible(true)}
          >
            <SlidersHorizontal size={20} color={colors.primary.DEFAULT} />
          </TouchableOpacity>
        </View>
        {Object.values(filters).some((value) => value !== '' && value !== 'newest') ? (
          <TouchableOpacity className="mt-2 self-start" onPress={() => setFilters(emptyFilters)}>
            <Text className="font-semibold text-primary">Xóa bộ lọc</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <Modal visible={filterVisible} transparent animationType="slide" onRequestClose={() => setFilterVisible(false)}>
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[88%] rounded-t-3xl bg-surface p-5">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-extrabold text-text-primary">Bộ lọc tìm kiếm</Text>
              <TouchableOpacity onPress={() => setFilterVisible(false)}><Text className="font-bold text-primary">Đóng</Text></TouchableOpacity>
            </View>

            <Text className="mb-2 font-bold text-text-primary">Danh mục</Text>
            <FlatList
              horizontal
              data={categoriesQuery.data ?? []}
              keyExtractor={(item) => item.id}
              showsHorizontalScrollIndicator={false}
              className="mb-4"
              renderItem={({ item }) => (
                <Chip label={item.name} selected={filters.categoryId === item.id} onPress={() => setFilters((current) => ({ ...current, categoryId: current.categoryId === item.id ? '' : item.id }))} />
              )}
            />

            <Text className="mb-2 font-bold text-text-primary">Tình trạng</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {conditionOptions.map((option) => <Chip key={option.value} label={option.label} selected={filters.condition === option.value} onPress={() => setFilters((current) => ({ ...current, condition: current.condition === option.value ? '' : option.value }))} />)}
            </View>

            <View className="mb-4 flex-row gap-3">
              <TextInput className="min-h-12 flex-1 rounded-xl border border-border bg-background px-3 text-text-primary" placeholder="Giá thấp nhất" placeholderTextColor={colors.text.muted} keyboardType="number-pad" value={filters.minPrice} onChangeText={(value) => setFilters((current) => ({ ...current, minPrice: value.replace(/[^0-9]/g, '') }))} />
              <TextInput className="min-h-12 flex-1 rounded-xl border border-border bg-background px-3 text-text-primary" placeholder="Giá cao nhất" placeholderTextColor={colors.text.muted} keyboardType="number-pad" value={filters.maxPrice} onChangeText={(value) => setFilters((current) => ({ ...current, maxPrice: value.replace(/[^0-9]/g, '') }))} />
            </View>

            <Text className="mb-2 font-bold text-text-primary">Khu vực</Text>
            <View className="mb-4 flex-row gap-3">
              <LocationPicker label="Tỉnh/Thành phố" value={filters.city} options={vietnamLocations.map((item) => item.name)} onChange={(city) => setFilters((current) => ({ ...current, city, district: '' }))} />
              <LocationPicker label="Quận/Huyện" value={filters.district} options={vietnamLocations.find((item) => item.name === filters.city)?.districts ?? ['Quận/Huyện khác']} onChange={(district) => setFilters((current) => ({ ...current, district }))} />
            </View>

            <Text className="mb-2 font-bold text-text-primary">Hình thức nhận</Text>
            <View className="mb-4 flex-row flex-wrap gap-2">
              {deliveryOptions.map((option) => <Chip key={option.value} label={option.label} selected={filters.deliveryMethod === option.value} onPress={() => setFilters((current) => ({ ...current, deliveryMethod: current.deliveryMethod === option.value ? '' : option.value }))} />)}
            </View>

            <Text className="mb-2 font-bold text-text-primary">Sắp xếp</Text>
            <View className="mb-5 flex-row flex-wrap gap-2">
              {sortOptions.map((option) => <Chip key={option.value} label={option.label} selected={filters.sort === option.value} onPress={() => setFilters((current) => ({ ...current, sort: option.value }))} />)}
            </View>
            <TouchableOpacity className="min-h-14 items-center justify-center rounded-xl bg-primary" onPress={() => setFilterVisible(false)}>
              <Text className="text-lg font-extrabold text-white">Áp dụng bộ lọc</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
          renderItem={({ item }) => <AssetCard asset={item} adminPreview={adminPreview} />}
          contentContainerClassName="p-4"
          refreshing={isRefetching}
          onRefresh={() => void refetch()}
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

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return <TouchableOpacity className={`rounded-full border px-3 py-2 ${selected ? 'border-primary bg-primary' : 'border-border bg-background'}`} onPress={onPress}>
    <Text className={`text-sm font-semibold ${selected ? 'text-white' : 'text-text-primary'}`}>{label}</Text>
  </TouchableOpacity>;
}

function LocationPicker({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  return <View className="min-w-0 flex-1">
    <TouchableOpacity className="min-h-12 justify-center rounded-xl border border-border bg-background px-3" onPress={() => setVisible(true)}>
      <Text numberOfLines={1} className={value ? 'text-text-primary' : 'text-text-muted'}>{value || label}</Text>
    </TouchableOpacity>
    <Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}>
      <View className="flex-1 justify-end bg-black/40"><View className="max-h-[70%] rounded-t-3xl bg-surface p-4">
        <View className="mb-3 flex-row items-center justify-between"><Text className="text-lg font-extrabold text-text-primary">{label}</Text><TouchableOpacity onPress={() => setVisible(false)}><Text className="font-bold text-primary">Đóng</Text></TouchableOpacity></View>
        <FlatList data={options} keyExtractor={(item) => item} renderItem={({ item }) => <TouchableOpacity className="mb-2 min-h-12 justify-center rounded-xl border border-border px-4" onPress={() => { onChange(item); setVisible(false); }}><Text className="font-semibold text-text-primary">{item}</Text></TouchableOpacity>} />
      </View></View>
    </Modal>
  </View>;
}

export default function DiscoverScreen() {
  return <DiscoverContent />;
}
