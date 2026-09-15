import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { AlertTriangle, ChevronLeft, RefreshCcw } from 'lucide-react-native';
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
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AdminReport,
  AdminReportAction,
  AdminReportStatus,
  AdminService,
  UpdateReportStatusPayload,
} from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

type ReportFilter = AdminReportStatus | 'ALL';

const filters: { value: ReportFilter; label: string }[] = [
  { value: 'OPEN', label: 'Mới' },
  { value: 'UNDER_REVIEW', label: 'Đang xử lý' },
  { value: 'RESOLVED', label: 'Đã xử lý' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'CLOSED', label: 'Đã đóng' },
  { value: 'ALL', label: 'Tất cả' },
];

const actions: { value: AdminReportAction; label: string }[] = [
  { value: 'NONE', label: 'Không hành động' },
  { value: 'WARN_REPORTED_USER', label: 'Cảnh báo user' },
  { value: 'SUSPEND_REPORTED_USER', label: 'Khóa user' },
  { value: 'HIDE_ASSET', label: 'Ẩn tài sản' },
  { value: 'HIDE_REVIEW', label: 'Ẩn review' },
  { value: 'HIDE_CHAT_MESSAGE', label: 'Ẩn tin nhắn' },
];

const statusLabels: Record<AdminReportStatus, string> = {
  OPEN: 'Mới',
  UNDER_REVIEW: 'Đang xử lý',
  RESOLVED: 'Đã xử lý',
  REJECTED: 'Từ chối',
  CLOSED: 'Đã đóng',
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminReportsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<ReportFilter>('OPEN');
  const reportsQuery = useQuery({
    queryKey: ['admin', 'reports', filter],
    queryFn: () => AdminService.listReports(filter === 'ALL' ? undefined : filter),
  });
  const mutation = useMutation({
    mutationFn: ({ reportId, payload }: { reportId: string; payload: UpdateReportStatusPayload }) =>
      AdminService.updateReportStatus(reportId, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reports'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue-counts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể xử lý report', 'Kiểm tra quyền hoặc hành động có tương thích target không.');
    },
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
          Kiểm duyệt report
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void reportsQuery.refetch()}
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

      {reportsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : reportsQuery.isError ? (
        <EmptyState
          title="Không thể tải report"
          description="Kiểm tra kết nối hoặc quyền kiểm duyệt rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void reportsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={reportsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={reportsQuery.isRefetching}
              onRefresh={() => void reportsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-bold text-text-secondary">
              {reportsQuery.data?.length ?? 0} report
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="Không có report"
              description="Report phù hợp bộ lọc sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void reportsQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <ReportCard
              report={item}
              isUpdating={mutation.isPending}
              onUpdate={(payload) => mutation.mutate({ reportId: item.id, payload })}
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

function ReportCard({
  report,
  isUpdating,
  onUpdate,
}: {
  report: AdminReport;
  isUpdating: boolean;
  onUpdate: (payload: UpdateReportStatusPayload) => void;
}) {
  const [action, setAction] = useState<AdminReportAction>('NONE');
  const [note, setNote] = useState('');
  const terminal = report.status === 'RESOLVED' || report.status === 'REJECTED' || report.status === 'CLOSED';

  const confirmUpdate = (status: AdminReportStatus) => {
    const trimmed = note.trim();
    const payload: UpdateReportStatusPayload = {
      status,
      action: status === 'RESOLVED' ? action : 'NONE',
      actionNote: trimmed || undefined,
      resolutionSummary:
        status === 'RESOLVED' || status === 'REJECTED' || status === 'CLOSED'
          ? trimmed || `Report closed as ${status} from RentLoop admin mobile.`
          : undefined,
    };

    Alert.alert('Cập nhật report?', `Report sẽ chuyển sang ${statusLabels[status]}.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: status === 'REJECTED' || status === 'CLOSED' ? 'destructive' : 'default',
        onPress: () => onUpdate(payload),
      },
    ]);
  };

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
          <AlertTriangle size={24} color={colors.danger} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-extrabold text-text-primary">
                {report.targetType} / {report.reason}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary">Target: {report.targetId}</Text>
            </View>
            <StatusBadge status={report.status} />
          </View>
          <Text className="mt-3 leading-6 text-text-secondary">{report.description}</Text>
          <Text className="mt-2 text-xs font-bold text-text-secondary">
            Người báo cáo: {report.reporter?.fullName ?? report.reporterId} - {formatDate(report.createdAt)}
          </Text>
        </View>
      </View>

      {report.resolutionSummary ? (
        <View className="mt-4 rounded-xl bg-success/10 p-3">
          <Text className="font-extrabold text-success">Kết luận</Text>
          <Text className="mt-1 text-text-secondary">{report.resolutionSummary}</Text>
        </View>
      ) : null}

      {!terminal ? (
        <View className="mt-4 border-t border-border pt-4">
          <Text className="mb-2 text-xs font-extrabold uppercase text-text-secondary">
            Hành động khi resolve
          </Text>
          <View className="flex-row flex-wrap gap-2">
            {actions.map((item) => (
              <TouchableOpacity
                key={item.value}
                className={`rounded-full px-3 py-2 ${
                  action === item.value ? 'bg-primary' : 'border border-border bg-surface'
                }`}
                onPress={() => setAction(item.value)}
              >
                <Text
                  className={`text-xs font-extrabold ${
                    action === item.value ? 'text-white' : 'text-text-secondary'
                  }`}
                >
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            className="mt-3 min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
            multiline
            onChangeText={setNote}
            placeholder="Ghi chú/kết luận xử lý"
            placeholderTextColor={colors.text.muted}
            textAlignVertical="top"
            value={note}
          />
          <View className="mt-3 flex-row flex-wrap gap-3">
            <ActionButton
              label="Đang xử lý"
              tone="warning"
              disabled={isUpdating}
              onPress={() => confirmUpdate('UNDER_REVIEW')}
            />
            <ActionButton
              label="Resolve"
              tone="success"
              disabled={isUpdating}
              onPress={() => confirmUpdate('RESOLVED')}
            />
            <ActionButton
              label="Từ chối"
              tone="danger"
              disabled={isUpdating}
              onPress={() => confirmUpdate('REJECTED')}
            />
            <ActionButton
              label="Đóng"
              tone="muted"
              disabled={isUpdating}
              onPress={() => confirmUpdate('CLOSED')}
            />
          </View>
        </View>
      ) : null}
    </View>
  );
}

function StatusBadge({ status }: { status: AdminReportStatus }) {
  if (status === 'RESOLVED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{statusLabels[status]}</Text>
      </View>
    );
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <View className="rounded-full bg-warning/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-warning">{statusLabels[status]}</Text>
      </View>
    );
  }

  if (status === 'OPEN') {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{statusLabels[status]}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs font-extrabold text-text-secondary">{statusLabels[status]}</Text>
    </View>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: 'warning' | 'success' | 'danger' | 'muted';
  disabled: boolean;
  onPress: () => void;
}) {
  const color =
    tone === 'success'
      ? 'bg-success'
      : tone === 'danger'
        ? 'bg-danger'
        : tone === 'warning'
          ? 'bg-warning'
          : 'bg-gray-500';

  return (
    <TouchableOpacity
      className={`min-h-12 w-[47%] items-center justify-center rounded-xl ${color} ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Text className="font-extrabold text-white">{label}</Text>
    </TouchableOpacity>
  );
}
