import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import {
  CheckCircle2,
  ChevronLeft,
  ExternalLink,
  Image as ImageIcon,
  RefreshCcw,
  ShieldCheck,
  XCircle,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
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
  AdminKycRequest,
  AdminService,
  KycVerificationStatus,
  ReviewKycPayload,
} from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

type KycFilter = KycVerificationStatus | 'ALL';

const filters: { value: KycFilter; label: string }[] = [
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'REQUIRES_REVIEW', label: 'Cần xem lại' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'VERIFIED', label: 'Đã duyệt' },
  { value: 'ALL', label: 'Tất cả' },
];

const statusLabels: Record<KycVerificationStatus, string> = {
  NOT_STARTED: 'Chưa bắt đầu',
  PENDING: 'Chờ duyệt',
  VERIFIED: 'Đã duyệt',
  REJECTED: 'Từ chối',
  REQUIRES_REVIEW: 'Cần xem lại',
};

function canReview(status: KycVerificationStatus) {
  return status === 'PENDING' || status === 'REQUIRES_REVIEW' || status === 'REJECTED';
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

export default function AdminKycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<KycFilter>('PENDING');
  const queryStatus = filter === 'ALL' ? undefined : filter;
  const requestsQuery = useQuery({
    queryKey: ['admin', 'kyc', filter],
    queryFn: () => AdminService.listKycRequests(queryStatus),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: ReviewKycPayload }) =>
      AdminService.reviewKycRequest(userId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'kyc'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật KYC', 'Kiểm tra quyền quản trị hoặc thử lại sau.');
    },
  });

  const reviewRequest = (
    request: AdminKycRequest,
    payload: ReviewKycPayload,
    title: string,
    message: string,
  ) => {
    Alert.alert(title, message, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: payload.verificationStatus === 'VERIFIED' ? 'Duyệt' : 'Từ chối',
        style: payload.verificationStatus === 'VERIFIED' ? 'default' : 'destructive',
        onPress: () => reviewMutation.mutate({ userId: request.userId, payload }),
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
          Duyệt KYC
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void requestsQuery.refetch()}
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

      {requestsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : requestsQuery.isError ? (
        <EmptyState
          title="Không thể tải hồ sơ KYC"
          description="Kiểm tra kết nối hoặc quyền quản trị rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void requestsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={requestsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={requestsQuery.isRefetching}
              onRefresh={() => void requestsQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Không có hồ sơ KYC"
              description="Các yêu cầu xác thực phù hợp bộ lọc sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void requestsQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <KycCard
              request={item}
              isUpdating={reviewMutation.isPending}
              onApprove={() =>
                reviewRequest(
                  item,
                  {
                    verificationStatus: 'VERIFIED',
                    faceMatchStatus: 'MATCHED',
                    reviewNote: 'Approved from RentLoop admin mobile.',
                  },
                  'Duyệt hồ sơ KYC?',
                  `${item.user.fullName} sẽ được xác thực danh tính.`,
                )
              }
              onReject={(note) =>
                reviewRequest(
                  item,
                  {
                    verificationStatus: 'REJECTED',
                    faceMatchStatus: 'NOT_MATCHED',
                    reviewNote: note.trim() || 'Rejected from RentLoop admin mobile.',
                  },
                  'Từ chối hồ sơ KYC?',
                  `${item.user.fullName} sẽ nhận trạng thái KYC bị từ chối.`,
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

function KycCard({
  request,
  isUpdating,
  onApprove,
  onReject,
}: {
  request: AdminKycRequest;
  isUpdating: boolean;
  onApprove: () => void;
  onReject: (note: string) => void;
}) {
  const [rejectNote, setRejectNote] = useState('');
  const reviewable = canReview(request.verificationStatus);

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
          <ShieldCheck size={24} color={colors.primary.DEFAULT} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-extrabold text-text-primary">
                {request.user.fullName}
              </Text>
              <Text className="mt-0.5 text-sm text-text-secondary">{request.user.email}</Text>
            </View>
            <StatusBadge status={request.verificationStatus} />
          </View>

          <View className="mt-3 flex-row flex-wrap gap-2">
            <InfoChip label={request.documentType} />
            <InfoChip label={request.maskedDocumentNumber} />
            <InfoChip label={`Trust ${request.user.trustScore}`} />
          </View>
        </View>
      </View>

      <View className="mt-4 rounded-xl bg-surface-secondary p-3">
        <InfoLine label="Số điện thoại" value={request.user.phone} />
        <InfoLine label="Face match" value={request.faceMatchStatus} />
        <InfoLine label="Gửi lúc" value={formatDate(request.createdAt)} />
        <InfoLine label="Cập nhật" value={formatDate(request.updatedAt)} />
      </View>

      <View className="mt-4">
        <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
          Tài liệu
        </Text>
        <View className="flex-row gap-3">
          <KycImage label="Mặt trước" url={request.documentFrontUrl} />
          <KycImage label="Mặt sau" url={request.documentBackUrl} />
          <KycImage label="Selfie" url={request.selfieUrl} />
        </View>
      </View>

      {reviewable ? (
        <View className="mt-4 border-t border-border pt-4">
          <TextInput
            className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
            multiline
            onChangeText={setRejectNote}
            placeholder="Ghi chú khi từ chối"
            placeholderTextColor={colors.text.muted}
            textAlignVertical="top"
            value={rejectNote}
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
              onPress={() => onReject(rejectNote)}
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
  );
}

function StatusBadge({ status }: { status: KycVerificationStatus }) {
  const label = statusLabels[status];

  if (status === 'VERIFIED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (status === 'REJECTED') {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{label}</Text>
      </View>
    );
  }

  if (status === 'REQUIRES_REVIEW') {
    return (
      <View className="rounded-full bg-warning/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-warning">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-primary-soft px-3 py-1">
      <Text className="text-xs font-extrabold text-primary">{label}</Text>
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

function KycImage({ label, url }: { label: string; url?: string | null }) {
  const openImage = () => {
    if (url) {
      void Linking.openURL(url);
    }
  };

  return (
    <TouchableOpacity
      className="min-h-32 flex-1 overflow-hidden rounded-xl border border-border bg-surface-secondary"
      disabled={!url}
      onPress={openImage}
    >
      {url ? (
        <Image source={{ uri: url }} style={{ height: 96, width: '100%' }} contentFit="cover" />
      ) : (
        <View className="h-24 items-center justify-center">
          <ImageIcon size={26} color={colors.text.muted} />
        </View>
      )}
      <View className="min-h-9 flex-row items-center justify-center px-2">
        <Text className="text-center text-xs font-bold text-text-secondary">{label}</Text>
        {url ? <ExternalLink size={12} color={colors.text.secondary} /> : null}
      </View>
    </TouchableOpacity>
  );
}
