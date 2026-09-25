import { colors } from '../../theme/colors';
import { View, Text, ScrollView, TouchableOpacity, FlatList, Dimensions, Alert, TextInput, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAsset } from '../../hooks/useAssets';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ChevronLeft, MapPin, Star, ShieldCheck, Heart, User, AlertCircle, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import type { User as UserType } from '../../types/domain';
import { canModerateAssets, isStaffUser } from '../../utils/roles';
import { synchronizeRemovedAsset } from '../../utils/assetCache';
import { AssetsService } from '../../services/assets/assets.service';
import { AdminService } from '../../services/admin/admin.service';
import { getApiErrorMessage } from '../../utils/apiError';

const { width } = Dimensions.get('window');

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuthStore();
  const [favoriteOverride, setFavoriteOverride] = useState<boolean | null>(null);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [removeReason, setRemoveReason] = useState('');
  const [isRemovingAsset, setIsRemovingAsset] = useState(false);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<UserType>('/auth/me')).data,
    enabled: isAuthenticated,
  });
  const isAdminPreview = isStaffUser(meQuery.data);

  const { data: asset, isLoading, isError } = useAsset(id);
  const isOwner = isAuthenticated && !!meQuery.data && asset?.ownerId === meQuery.data.id;
  const canRemove = isAuthenticated && (isOwner || canModerateAssets(meQuery.data)) &&
    asset?.status !== 'ARCHIVED';
  const needsRemovalReason = canRemove && !isOwner;

  const isFavorite = favoriteOverride ?? asset?.isFavorite ?? false;

  const requireLogin = () => {
    Alert.alert(
      'Cần đăng nhập',
      'Bạn cần đăng nhập trước khi gửi yêu cầu thuê.',
      [
        { text: 'Để sau', style: 'cancel' },
        { text: 'Đăng nhập', onPress: () => router.push('/auth/login') },
      ],
    );
  };

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

  const removeAsset = () => {
    if (!canRemove || isRemovingAsset) return;
    const reason = removeReason.trim();

    if (needsRemovalReason && !reason) {
      Alert.alert('Cần lý do xóa bài', 'Nhập lý do để thông báo cho chủ bài đăng.');
      return;
    }

    Alert.alert(
      'Xóa bài đăng?',
      `"${asset?.title ?? 'Bài đăng'}" sẽ được xóa khỏi danh sách bài đăng.${needsRemovalReason ? ' Chủ bài đăng sẽ nhận được lý do.' : ''}`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xóa bài',
          style: 'destructive',
          onPress: async () => {
            setIsRemovingAsset(true);
            try {
              if (needsRemovalReason) {
                await AdminService.removeAsset(id, reason);
              } else {
                await AssetsService.remove(id);
              }
              await synchronizeRemovedAsset(queryClient, id);
              Alert.alert('Đã xóa bài', 'Bài đăng đã được xóa khỏi danh sách.', [
                { text: 'OK', onPress: () => router.back() },
              ]);
            } catch (error) {
              Alert.alert('Không thể xóa bài', getApiErrorMessage(error, 'Kiểm tra kết nối và thử lại.'));
            } finally {
              setIsRemovingAsset(false);
            }
          },
        },
      ],
    );
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
          Chi tiết
        </Text>
        {isAdminPreview || isOwner ? (
          <View className="w-10" />
        ) : (
          <TouchableOpacity
            className="p-2 -mr-2"
            onPress={toggleFavorite}
            disabled={isTogglingFavorite}
          >
            <Heart size={24} color={isFavorite ? colors.danger : "#6B7280"} fill={isFavorite ? colors.danger : "transparent"} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        className="flex-1"
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
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

          <View className="mb-6 rounded-2xl border border-border bg-surface p-4">
            <Text className="mb-3 text-lg font-bold text-text-primary">Thông tin sản phẩm</Text>
            <DetailRow label="Tình trạng" value={asset.condition} />
            {asset.brand ? <DetailRow label="Thương hiệu" value={asset.brand} /> : null}
            {asset.model ? <DetailRow label="Model" value={asset.model} /> : null}
            {asset.estimatedValue ? <DetailRow label="Giá trị tham khảo" value={new Intl.NumberFormat('vi-VN').format(asset.estimatedValue) + ' VND'} /> : null}
            <DetailRow label="Số lượt cho thuê" value={String(asset.completedRentalCount)} />
            <DetailRow label="Thời gian thuê" value={`${asset.minimumDurationDays ?? 1} - ${asset.maximumDurationDays ?? 30} ngày`} />
            <DetailRow label="Hình thức nhận" value={asset.deliveryMethods.length ? asset.deliveryMethods.join(', ') : 'Nhận trực tiếp'} />
          </View>

          {asset.accessories?.length ? (
            <View className="mb-6">
              <Text className="mb-2 text-lg font-bold text-text-primary">Phụ kiện đi kèm</Text>
              {asset.accessories.map((accessory) => (
                <Text key={accessory.name} className="mb-1 text-text-secondary">• {accessory.name} (x{accessory.quantity}){accessory.description ? ` - ${accessory.description}` : ''}</Text>
              ))}
            </View>
          ) : null}

          {asset.usageInstructions ? (
            <View className="mb-6">
              <Text className="mb-2 text-lg font-bold text-text-primary">Hướng dẫn sử dụng</Text>
              <Text className="text-text-secondary leading-6">{asset.usageInstructions}</Text>
            </View>
          ) : null}

        </View>
      </ScrollView>

      {canRemove ? (
        <View className="px-5 py-4 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          {needsRemovalReason ? <TextInput
            accessibilityLabel="Lý do xóa bài"
            className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
            multiline
            onChangeText={setRemoveReason}
            placeholder="Lý do xóa bài"
            placeholderTextColor={colors.text.muted}
            textAlignVertical="top"
            value={removeReason}
          /> : null}
          <TouchableOpacity
            accessibilityLabel="Xóa bài đăng"
            className="mt-3 min-h-12 flex-row items-center justify-center rounded-xl bg-danger"
            disabled={isRemovingAsset}
            onPress={removeAsset}
          >
            {isRemovingAsset ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Trash2 size={18} color="white" />
                <Text className="ml-2 font-extrabold text-white">Xóa bài</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : !isAdminPreview && !isOwner && asset.status === 'ACTIVE' ? (
        <View className="px-5 py-5 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <TouchableOpacity
            className="bg-primary rounded-xl py-4 items-center shadow-md flex-row justify-center"
            onPress={() => {
              if (!isAuthenticated) {
                requireLogin();
                return;
              }

              router.push(`/asset/${id}/book`);
            }}
          >
            <Text className="text-white font-bold text-lg">Yêu cầu thuê ngay</Text>
          </TouchableOpacity>
        </View>
      ) : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row justify-between gap-4">
      <Text className="text-text-secondary">{label}</Text>
      <Text className="flex-1 text-right font-semibold text-text-primary">{value}</Text>
    </View>
  );
}
