import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  ChevronLeft,
  Eye,
  Image as ImageIcon,
  MapPin,
  RefreshCcw,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AdminAsset,
  AdminService,
  ModerateAssetPayload,
} from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';
import type { AssetStatus } from '../../types/domain';

type ListingFilter = AssetStatus | 'ALL';

const filters: { value: ListingFilter; label: string }[] = [
  { value: 'PENDING_REVIEW', label: 'Chờ duyệt' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'SUSPENDED', label: 'Đã khóa' },
  { value: 'ACTIVE', label: 'Đang hiện' },
  { value: 'ALL', label: 'Tất cả' },
];

const statusLabels: Record<AssetStatus, string> = {
  DRAFT: 'Nháp',
  PENDING_REVIEW: 'Chờ duyệt',
  ACTIVE: 'Đang hiện',
  PAUSED: 'Tạm dừng',
  REJECTED: 'Từ chối',
  SUSPENDED: 'Đã khóa',
  ARCHIVED: 'Lưu trữ',
};

function formatMoney(value?: number | null) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function canReview(status: AssetStatus) {
  return status === 'PENDING_REVIEW' || status === 'REJECTED' || status === 'SUSPENDED';
}

export default function AdminListingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ListingFilter>('PENDING_REVIEW');
  const queryStatus = filter === 'ALL' ? undefined : filter;
  const listingsQuery = useQuery({
    queryKey: ['admin', 'listings', filter],
    queryFn: () => AdminService.listAssetModerationRequests(queryStatus),
  });
  const moderationMutation = useMutation({
    mutationFn: ({ assetId, payload }: { assetId: string; payload: ModerateAssetPayload }) =>
      AdminService.moderateAsset(assetId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'listings'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật bài đăng', 'Kiểm tra quyền kiểm duyệt hoặc thử lại sau.');
    },
  });

  const confirmModeration = (
    asset: AdminAsset,
    payload: ModerateAssetPayload,
    title: string,
    message: string,
  ) => {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: payload.status === 'ACTIVE' ? 'Duyệt' : 'Từ chối',
        style: payload.status === 'ACTIVE' ? 'default' : 'destructive',
        onPress: () => moderationMutation.mutate({ assetId: asset.id, payload }),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-text-primary">
          Duyệt bài đăng
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void listingsQuery.refetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      <View className="border-b border-border bg-surface px-4 py-3">
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <FilterButton
              label={item.label}
              selected={item.value === filter}
              onPress={() => setFilter(item.value)}
            />
          )}
        />
      </View>

      {listingsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : listingsQuery.isError ? (
        <EmptyState
          title="Không thể tải bài đăng"
          description="Kiểm tra kết nối hoặc quyền kiểm duyệt rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void listingsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={listingsQuery.data?.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={listingsQuery.isRefetching}
              onRefresh={() => void listingsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-bold text-text-secondary">
              {listingsQuery.data?.pagination.total ?? 0} bài đăng
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="Không có bài đăng"
              description="Các bài đăng phù hợp bộ lọc sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void listingsQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <ListingCard
              asset={item}
              isUpdating={moderationMutation.isPending}
              onOpen={() => router.push(`/asset/${item.id}` as any)}
              onApprove={() =>
                confirmModeration(
                  item,
                  {
                    status: 'ACTIVE',
                    reason: 'Approved from RentLoop admin mobile.',
                  },
                  'Duyệt bài đăng?',
                  `"${item.title}" sẽ được hiển thị trên marketplace.`,
                )
              }
              onReject={(reason) =>
                confirmModeration(
                  item,
                  {
                    status: 'REJECTED',
                    reason: reason.trim() || 'Rejected from RentLoop admin mobile.',
                  },
                  'Từ chối bài đăng?',
                  `"${item.title}" sẽ bị chuyển sang trạng thái từ chối.`,
                )
              }
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function FilterButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  if (selected) {
    return (
      <TouchableOpacity className="mr-2 rounded-full bg-primary px-4 py-2" onPress={onPress}>
        <Text className="text-sm font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className="mr-2 rounded-full border border-border bg-surface px-4 py-2"
      onPress={onPress}
    >
      <Text className="text-sm font-bold text-text-secondary">{label}</Text>
    </TouchableOpacity>
  );
}

function ListingCard({
  asset,
  isUpdating,
  onOpen,
  onApprove,
  onReject,
}: {
  asset: AdminAsset;
  isUpdating: boolean;
  onOpen: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
}) {
  const [rejectReason, setRejectReason] = useState('');
  const coverImage = asset.images?.find((image) => image.isCover)?.url ?? asset.images?.[0]?.url;
  const reviewable = canReview(asset.status);

  return (
    <View className="mb-4 overflow-hidden rounded-2xl border border-border bg-surface">
      {coverImage ? (
        <Image source={{ uri: coverImage }} style={{ height: 180, width: '100%' }} contentFit="cover" />
      ) : (
        <View className="h-44 items-center justify-center bg-surface-secondary">
          <ImageIcon size={36} color={colors.text.muted} />
          <Text className="mt-2 text-sm font-semibold text-text-secondary">Không có ảnh</Text>
        </View>
      )}

      <View className="p-4">
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-lg font-extrabold text-text-primary">{asset.title}</Text>
            <Text className="mt-1 text-sm text-text-secondary" numberOfLines={2}>
              {asset.description || 'Chưa có mô tả'}
            </Text>
          </View>
          <StatusBadge status={asset.status} />
        </View>

        <View className="mt-3 flex-row flex-wrap gap-2">
          <InfoChip label={asset.category?.name ?? 'Chưa phân loại'} />
          <InfoChip label={asset.condition} />
          <InfoChip label={`${asset.images?.length ?? 0} ảnh`} />
        </View>

        <View className="mt-4 rounded-xl bg-surface-secondary p-3">
          <InfoLine label="Giá thuê" value={`${formatMoney(asset.pricePerDay)}/ngày`} />
          <InfoLine label="Giá trị ước tính" value={formatMoney(asset.estimatedValue)} />
          <InfoLine label="Thời lượng" value={`${asset.minimumDurationDays ?? 1}-${asset.maximumDurationDays ?? 1} ngày`} />
          <InfoLine label="Gửi lúc" value={formatDate(asset.createdAt)} />
        </View>

        <View className="mt-4 flex-row items-center rounded-xl border border-border p-3">
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
            <UserRound size={20} color={colors.primary.DEFAULT} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="font-extrabold text-text-primary">
              {asset.owner?.fullName ?? 'Chủ sở hữu'}
            </Text>
            <Text className="mt-0.5 text-sm text-text-secondary">
              Trust score {asset.owner?.trustScore ?? 0}
            </Text>
          </View>
          <View className="ml-3 flex-row items-center">
            <MapPin size={15} color={colors.text.secondary} />
            <Text className="ml-1 text-sm font-bold text-text-secondary">{asset.district}</Text>
          </View>
        </View>

        <TouchableOpacity
          className="mt-4 min-h-11 flex-row items-center justify-center rounded-xl border border-primary/25 bg-primary-soft"
          onPress={onOpen}
        >
          <Eye size={18} color={colors.primary.DEFAULT} />
          <Text className="ml-2 font-extrabold text-primary">Xem chi tiết</Text>
        </TouchableOpacity>

        {reviewable ? (
          <View className="mt-4 border-t border-border pt-4">
            <TextInput
              className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
              multiline
              onChangeText={setRejectReason}
              placeholder="Lý do khi từ chối"
              placeholderTextColor={colors.text.muted}
              textAlignVertical="top"
              value={rejectReason}
            />
            <View className="mt-3 flex-row gap-3">
              <TouchableOpacity
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-success"
                disabled={isUpdating}
                onPress={onApprove}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <CheckCircle2 size={18} color="white" />
                    <Text className="ml-2 font-extrabold text-white">Duyệt</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-danger"
                disabled={isUpdating}
                onPress={() => onReject(rejectReason)}
              >
                {isUpdating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <XCircle size={18} color="white" />
                    <Text className="ml-2 font-extrabold text-white">Từ chối</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

function StatusBadge({ status }: { status: AssetStatus }) {
  const label = statusLabels[status];

  if (status === 'ACTIVE') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (status === 'REJECTED' || status === 'SUSPENDED') {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{label}</Text>
      </View>
    );
  }

  if (status === 'PENDING_REVIEW') {
    return (
      <View className="rounded-full bg-warning/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-warning">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs font-extrabold text-text-secondary">{label}</Text>
    </View>
  );
}

function InfoChip({ label }: { label: string }) {
  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs font-bold text-text-secondary">{label}</Text>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="mr-4 flex-1 text-sm text-text-secondary">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-bold text-text-primary">{value}</Text>
    </View>
  );
}
