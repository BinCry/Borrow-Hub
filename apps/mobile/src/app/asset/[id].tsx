import { colors } from '../../theme/colors';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Dimensions, Alert } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAsset } from '../../hooks/useAssets';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChevronLeft, MapPin, Star, ShieldCheck, Heart, User, AlertCircle } from 'lucide-react-native';
import { useState } from 'react';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';

const { width } = Dimensions.get('window');

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const { data: asset, isLoading, isError } = useAsset(id);

  const isFavorite = favoriteOverride ?? asset?.isFavorite ?? false;

  const toggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    
    setIsTogglingFavorite(true);
    try {
      if (isFavorite) {
        await apiClient.delete(`/favorites/assets/${id}`);
        setFavoriteOverride(false);
      } else {
        await apiClient.post(`/favorites/assets/${id}`);
        setFavoriteOverride(true);
      }
    } catch {
      Alert.alert('Không thể cập nhật', 'Vui lòng thử lại sau.');
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
          <Skeleton width={32} height={32} borderRadius={16} />
          <Skeleton width={100} height={24} />
          <Skeleton width={32} height={32} borderRadius={16} />
        </View>
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
           <Skeleton width="100%" height={width * 0.75} borderRadius={0} />
           <View className="p-5">
              <Skeleton width="80%" height={28} style={{ marginBottom: 10 }} />
              <Skeleton width="40%" height={24} style={{ marginBottom: 24 }} />
              <Skeleton width="100%" height={60} style={{ marginBottom: 24 }} />
              <Skeleton width="100%" height={60} style={{ marginBottom: 24 }} />
              <Skeleton width="50%" height={24} style={{ marginBottom: 12 }} />
              <Skeleton width="100%" height={100} />
           </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (isError || !asset) {
    return (
      <SafeAreaView className="flex-1 bg-background">
         <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
            <ChevronLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>Chi tiết</Text>
          <View className="w-10" />
        </View>
        <EmptyState 
           title="Không thể tải chi tiết"
           description="Đã xảy ra lỗi khi tải dữ liệu tài sản. Vui lòng thử lại sau."
           buttonText="Quay lại"
           onPress={() => router.back()}
           icon={<AlertCircle size={40} color="#EF4444" />}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
          Chi tiết
        </Text>
        <TouchableOpacity 
          className="p-2 -mr-2" 
          onPress={toggleFavorite}
          disabled={isTogglingFavorite}
        >
          <Heart size={24} color={isFavorite ? colors.danger : "#6B7280"} fill={isFavorite ? colors.danger : "transparent"} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View className="bg-gray-100 relative">
          {asset.images && asset.images.length > 0 ? (
            <FlatList
              data={asset.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              onMomentumScrollEnd={(event) => {
                setCurrentImageIndex(
                  Math.round(event.nativeEvent.contentOffset.x / width),
                );
              }}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={{ width, height: width }}
                  contentFit="cover"
                  transition={200}
                />
              )}
            />
          ) : (
            <View style={{ width, height: width }} className="items-center justify-center">
              <Text className="text-text-secondary">Không có hình ảnh</Text>
            </View>
          )}
          
          {asset.images && asset.images.length > 1 && (
            <View className="absolute bottom-4 left-0 right-0 flex-row justify-center space-x-1.5">
               {asset.images.map((_, index) => (
                  <View key={index} className={`h-2 rounded-full ${index === currentImageIndex ? 'w-5 bg-primary' : 'w-2 bg-white/60'}`} />
               ))}
            </View>
          )}
        </View>

        <View className="p-5">
          {/* Header Info */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-text-primary mb-1">{asset.title}</Text>
            <View className="flex-row items-center">
              <Text className="text-xl font-bold text-primary mr-2">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)}
                <Text className="text-base text-text-secondary font-normal">/ngày</Text>
              </Text>
              {asset.rating !== undefined && (
                <View className="flex-row items-center bg-primary-soft px-2 py-1 rounded-full">
                  <Star size={14} color={colors.primary.DEFAULT} fill={colors.primary.DEFAULT} />
                  <Text className="text-primary font-bold text-sm ml-1">{asset.rating}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View className="flex-row items-center mb-6 pb-6 border-b border-border">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <MapPin size={20} color={colors.primary.DEFAULT} />
            </View>
            <View>
              <Text className="text-text-secondary text-xs">Khu vực</Text>
              <Text className="text-text-primary font-medium">{asset.location?.district}, {asset.location?.city}</Text>
            </View>
          </View>

          {/* Owner Profile */}
          <View className="flex-row items-center mb-8 pb-6 border-b border-border bg-surfaceSecondary rounded-2xl p-4">
            <View className="w-14 h-14 rounded-full bg-primary-soft items-center justify-center mr-4 overflow-hidden border border-gray-200">
              {asset.owner?.avatarUrl ? (
                <Image source={{ uri: asset.owner.avatarUrl }} style={{ width: '100%', height: '100%' }} />
              ) : (
                <User size={28} color={colors.primary.DEFAULT} />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-extrabold text-lg">{asset.owner?.fullName || 'Chủ sở hữu'}</Text>
              <View className="flex-row items-center mt-1">
                <ShieldCheck size={16} color="#2F855A" />
                <Text className="text-success text-sm font-semibold ml-1.5">
                  Đã xác minh danh tính
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-text-primary mb-2">Mô tả</Text>
            <Text className="text-text-secondary leading-6">{asset.description}</Text>
          </View>

        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 py-5 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <TouchableOpacity 
          className="bg-primary rounded-xl py-4 items-center shadow-md flex-row justify-center"
          onPress={() => router.push(`/asset/${id}/book`)}
        >
          <Text className="text-white font-bold text-lg">Yêu cầu thuê ngay</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
