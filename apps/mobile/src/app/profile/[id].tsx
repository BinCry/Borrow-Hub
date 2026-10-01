import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, RefreshControl } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, User } from 'lucide-react-native';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

type PublicProfile = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  trustScore?: number;
  createdAt?: string;
  isVerified?: boolean;
  verificationStatus?: string;
  activeListingCount?: number;
  totalRentals?: number;
  averageRating?: number | null;
  reviewCount?: number;
  assets?: { id: string; title: string; pricePerDay: number; city: string; district: string; images: { url: string }[] }[];
  reviews?: { id: string; rating: number; comment: string | null; createdAt: string; reviewer: { fullName: string } }[];
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    trustScore?: string;
  }>();
  const profileQuery = useQuery({
    queryKey: ['public-profile', id],
    queryFn: async () => (await apiClient.get<PublicProfile>(`/users/${id}/public`)).data,
    enabled: Boolean(id),
  });
  const profile = profileQuery.data;
  const verificationStatus = profile?.verificationStatus
    ?? (profile?.isVerified === true ? 'VERIFIED' : profile?.isVerified === false ? 'NOT_STARTED' : undefined);
  const verificationLabel = verificationStatus === 'VERIFIED'
    ? 'Đã xác minh danh tính'
    : verificationStatus === 'PENDING' || verificationStatus === 'REQUIRES_REVIEW'
      ? 'Đang chờ duyệt xác minh danh tính'
      : verificationStatus === 'REJECTED'
        ? 'Hồ sơ xác minh chưa được duyệt'
        : verificationStatus === 'NOT_STARTED'
          ? 'Chưa xác minh danh tính'
          : 'Chưa có dữ liệu trạng thái xác minh';

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity accessibilityLabel="Quay lại" className="mr-3 rounded-full p-1" onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Hồ sơ người đăng</Text>
      </View>

      {profileQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.primary.DEFAULT} /></View>
      ) : !profile ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-text-secondary">Không thể tải hồ sơ người đăng.</Text>
          <TouchableOpacity accessibilityRole="button" className="mt-4 rounded-xl bg-primary px-5 py-3" onPress={() => void profileQuery.refetch()}>
            <Text className="font-bold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView refreshControl={<RefreshControl refreshing={profileQuery.isRefetching} onRefresh={() => void profileQuery.refetch()} />} contentContainerStyle={{ paddingBottom: 32 }}>
        <View className="items-center bg-surface px-5 pb-8 pt-8">
          <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary-soft bg-primary-soft">
            {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={42} color={colors.primary.DEFAULT} />}
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-text-primary">{profile.fullName}</Text>
          <View className="mt-2 flex-row items-center rounded-full bg-primary-soft px-3 py-1.5">
            <ShieldCheck size={16} color={colors.success} />
            <Text className="ml-1.5 font-semibold text-success">Điểm uy tín {profile.trustScore ?? 0}</Text>
          </View>
          <Text className="mt-4 text-sm text-text-secondary">Thông tin công khai của người cho thuê</Text>
          <Text className="mt-2 text-sm text-text-secondary">
            {verificationLabel}
          </Text>
          <Text className="mt-2 text-sm text-text-secondary">
            Tham gia: {profile.createdAt ? new Date(profile.createdAt).toLocaleDateString('vi-VN') : 'Chưa có thông tin'}
          </Text>
        </View>
        <View className="m-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="text-lg font-bold text-text-primary">Hoạt động cho thuê</Text>
          {[
            ['Tin đang cho thuê', profile.activeListingCount ?? 0],
            ['Tổng đơn đã thanh toán', profile.totalRentals ?? 0],
            ['Đánh giá', profile.reviewCount ? `${profile.averageRating?.toFixed(1) ?? '—'}/5 (${profile.reviewCount} đánh giá)` : 'Chưa có đánh giá'],
          ].map(([label, value]) => (
            <View key={label} className="mt-3 flex-row justify-between gap-3">
              <Text className="flex-1 text-text-secondary">{label}</Text>
              <Text className="flex-1 text-right font-semibold text-text-primary">{value}</Text>
            </View>
          ))}
        </View>
        <View className="px-4">
          <Text className="mb-3 text-lg font-bold text-text-primary">Tin cho thuê mới nhất</Text>
          {!profile.assets?.length ? <Text className="mb-4 text-text-secondary">Chưa có tin đang cho thuê.</Text> : profile.assets.map((asset) => (
            <TouchableOpacity key={asset.id} accessibilityRole="button" accessibilityLabel={`Xem ${asset.title}`} onPress={() => router.push({ pathname: '/asset/[id]', params: { id: asset.id } })} className="mb-3 flex-row rounded-2xl border border-border bg-surface p-3">
              {asset.images[0]?.url ? <Image source={{ uri: asset.images[0].url }} style={{ width: 80, height: 80, borderRadius: 12 }} contentFit="cover" /> : <View className="h-20 w-20 rounded-xl bg-primary-soft" />}
              <View className="ml-3 flex-1">
                <Text numberOfLines={2} className="font-bold text-text-primary">{asset.title}</Text>
                <Text className="mt-1 text-sm text-text-secondary">{[asset.district, asset.city].filter(Boolean).join(', ')}</Text>
                <Text className="mt-1 font-semibold text-primary">{asset.pricePerDay.toLocaleString('vi-VN')} đ/ngày</Text>
              </View>
            </TouchableOpacity>
          ))}
          <Text className="mb-3 mt-4 text-lg font-bold text-text-primary">Đánh giá gần đây</Text>
          {!profile.reviews?.length ? <Text className="text-text-secondary">Chưa có đánh giá.</Text> : profile.reviews.map((review) => (
            <View key={review.id} className="mb-3 rounded-2xl border border-border bg-surface p-4">
              <Text className="font-bold text-text-primary">{review.reviewer.fullName}</Text>
              <Text className="mt-1 text-sm text-text-secondary">{review.rating}/5 · {new Date(review.createdAt).toLocaleDateString('vi-VN')}</Text>
              <Text className="mt-2 text-text-primary">{review.comment || 'Không có nhận xét bằng văn bản.'}</Text>
            </View>
          ))}
        </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
