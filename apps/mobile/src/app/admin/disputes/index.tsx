import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ChevronLeft,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  UserRound,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  AdminDispute,
  AdminDisputeStatus,
  AdminService,
} from '../../../services/admin/admin.service';
import { colors } from '../../../theme/colors';

type DisputeFilter = AdminDisputeStatus | 'ALL';

const filters: { value: DisputeFilter; label: string }[] = [
  { value: 'OPEN', label: 'Mới mở' },
  { value: 'WAITING_RESPONSE', label: 'Chờ phản hồi' },
  { value: 'UNDER_REVIEW', label: 'Đang xử lý' },
  { value: 'RESOLVED', label: 'Đã giải quyết' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'ALL', label: 'Tất cả' },
];

const statusLabels: Record<AdminDisputeStatus, string> = {
  OPEN: 'Mới mở',
  WAITING_RESPONSE: 'Chờ phản hồi',
  UNDER_REVIEW: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối',
  CLOSED: 'Đã đóng',
};

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

export default function AdminDisputesScreen() {
  const router = useRouter();
  const [filter, setFilter] = useState<DisputeFilter>('OPEN');
  const queryStatus = filter === 'ALL' ? undefined : filter;
  const disputesQuery = useQuery({
    queryKey: ['admin', 'disputes', filter],
    queryFn: () => AdminService.listDisputes(queryStatus),
  });

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
          Tranh chấp
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void disputesQuery.refetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      <View className="border-b border-border bg-surface px-4 py-3">
        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.value}
          renderItem={({ item }) => (
            <FilterButton
              label={item.label}
              selected={item.value === filter}
              onPress={() => setFilter(item.value)}
            />
          )}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      {disputesQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : disputesQuery.isError ? (
        <EmptyState
          title="Không thể tải tranh chấp"
          description="Kiểm tra quyền xử lý tranh chấp hoặc kết nối rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void disputesQuery.refetch()}
        />
      ) : (
        <FlatList
          data={disputesQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={disputesQuery.isRefetching}
              onRefresh={() => void disputesQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-bold text-text-secondary">
              {disputesQuery.data?.length ?? 0} tranh chấp
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="Không có tranh chấp"
              description="Các hồ sơ phù hợp bộ lọc sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void disputesQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <DisputeCard
              dispute={item}
              onPress={() => router.push(`/admin/disputes/${item.id}` as any)}
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

function DisputeCard({ dispute, onPress }: { dispute: AdminDispute; onPress: () => void }) {
  return (
    <TouchableOpacity className="mb-4 rounded-2xl border border-border bg-surface p-4" onPress={onPress}>
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <ShieldAlert size={24} color={colors.danger} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-extrabold text-text-primary" numberOfLines={2}>
                {dispute.rental.asset.title}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary" numberOfLines={2}>
                {dispute.reason}: {dispute.description}
              </Text>
            </View>
            <StatusBadge status={dispute.status} />
          </View>

          <View className="mt-4 rounded-xl bg-surface-secondary p-3">
            <InfoLine icon={UserRound} label="Người mở" value={dispute.openedBy.fullName} />
            <InfoLine
              icon={AlertTriangle}
              label="Hai bên"
              value={`${dispute.rental.owner.fullName} / ${dispute.rental.renter.fullName}`}
            />
            <InfoLine icon={Clock3} label="Tạo lúc" value={formatDate(dispute.createdAt)} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function StatusBadge({ status }: { status: AdminDisputeStatus }) {
  const label = statusLabels[status];

  if (status === 'RESOLVED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (status === 'REJECTED' || status === 'CLOSED') {
    return (
      <View className="rounded-full bg-gray-100 px-3 py-1">
        <Text className="text-xs font-extrabold text-text-secondary">{label}</Text>
      </View>
    );
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <View className="rounded-full bg-warning/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-warning">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-danger/10 px-3 py-1">
      <Text className="text-xs font-extrabold text-danger">{label}</Text>
    </View>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-1">
      <Icon size={15} color={colors.text.secondary} />
      <Text className="ml-2 mr-3 text-sm text-text-secondary">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm font-bold text-text-primary" numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}
