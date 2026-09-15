import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Banknote,
  ClipboardCheck,
  Flag,
  RefreshCcw,
  ShieldAlert,
  ShieldCheck,
  Users,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAdminQueueCounts } from '../../hooks/useAdminQueueCounts';
import { AdminDashboard, AdminService } from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboardTab() {
  const router = useRouter();
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: AdminService.getDashboard,
  });
  const queueCounts = useAdminQueueCounts();

  const refetch = () => {
    void dashboardQuery.refetch();
    queueCounts.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
        <View>
          <Text className="text-2xl font-extrabold text-text-primary">Tổng quan</Text>
          <Text className="mt-0.5 text-sm font-semibold text-text-secondary">
            Bảng điều hành RentLoop
          </Text>
        </View>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void dashboardQuery.refetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {dashboardQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : dashboardQuery.isError || !dashboardQuery.data ? (
        <EmptyState
          title="Không thể tải tổng quan"
          description="Kiểm tra kết nối hoặc quyền tài khoản rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void dashboardQuery.refetch()}
        />
      ) : (
        <DashboardContent
          data={dashboardQuery.data}
          queueCounts={queueCounts.counts}
          refreshing={dashboardQuery.isRefetching || queueCounts.isRefetching}
          onRefresh={refetch}
          onKyc={() => router.push('/admin/kyc' as never)}
          onListings={() => router.push('/admin/listings' as never)}
          onDisputes={() => router.push('/admin/disputes' as never)}
          onReports={() => router.push('/admin/reports' as never)}
          onFinance={() => router.push('/admin/finance' as never)}
        />
      )}
    </SafeAreaView>
  );
}

function DashboardContent({
  data,
  queueCounts,
  refreshing,
  onRefresh,
  onKyc,
  onListings,
  onDisputes,
  onReports,
  onFinance,
}: {
  data: AdminDashboard;
  queueCounts: ReturnType<typeof useAdminQueueCounts>['counts'];
  refreshing: boolean;
  onRefresh: () => void;
  onKyc: () => void;
  onListings: () => void;
  onDisputes: () => void;
  onReports: () => void;
  onFinance: () => void;
}) {
  const openIssues = data.risk.openDisputes + data.risk.openReports;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
        <Text className="text-xs font-extrabold uppercase text-text-secondary">
          Cần xử lý ngay
        </Text>
        <View className="mt-4 flex-row flex-wrap gap-3">
          <ActionMetric icon={ShieldCheck} label="Chờ duyệt KYC" value={`${queueCounts.pendingKyc}`} onPress={onKyc} />
          <ActionMetric icon={ClipboardCheck} label="Bài chờ duyệt" value={`${queueCounts.pendingListings}`} onPress={onListings} />
          <ActionMetric icon={ShieldAlert} label="Tranh chấp mở" value={`${queueCounts.openDisputes}`} onPress={onDisputes} />
          <ActionMetric icon={Flag} label="Report mở" value={`${queueCounts.openReports}`} onPress={onReports} />
        </View>
      </View>

      <View className="mb-4 flex-row gap-3">
        <MetricPanel icon={Users} label="Người dùng" value={`${data.users.total}`} helper={`${data.users.verified} đã KYC`} />
        <MetricPanel icon={AlertTriangle} label="Vấn đề mở" value={`${openIssues}`} helper={`${data.risk.fraudReports} fraud`} />
      </View>

      <TouchableOpacity
        className="mb-4 rounded-2xl border border-border bg-surface p-5"
        onPress={onFinance}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
            <Banknote size={22} color={colors.primary.DEFAULT} />
          </View>
          <View className="flex-1">
            <Text className="text-xs font-extrabold uppercase text-text-secondary">GMV</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">
              {formatMoney(data.finance.gmv)}
            </Text>
          </View>
        </View>
        <View className="mt-4">
          <MetricLine label="Doanh thu nền tảng" value={formatMoney(data.finance.platformRevenue)} />
          <MetricLine label="Refund" value={`${data.finance.refundCount} / ${formatMoney(data.finance.refundAmount)}`} />
          <MetricLine label="Payout bị chặn" value={`${data.finance.blockedPayoutCount}`} />
        </View>
      </TouchableOpacity>

      <View className="rounded-2xl border border-border bg-surface p-4">
        <Text className="text-xs font-extrabold uppercase text-text-secondary">
          Trạng thái đơn thuê
        </Text>
        <View className="mt-2">
          <MetricLine label="Tổng đơn" value={`${data.marketplace.totalRentals}`} />
          <MetricLine label="Hoàn tất" value={`${data.marketplace.completedRentals}`} />
          <MetricLine label="Đã hủy" value={`${data.marketplace.cancelledRentals}`} />
          <MetricLine label="Quá hạn" value={`${data.marketplace.overdueRentals}`} />
        </View>
      </View>
    </ScrollView>
  );
}

function ActionMetric({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="min-h-24 w-[47%] rounded-xl bg-surfaceSecondary p-4" onPress={onPress}>
      <Icon size={21} color={colors.primary.DEFAULT} />
      <Text className="mt-3 text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="mt-0.5 text-sm font-bold text-text-secondary">{label}</Text>
    </TouchableOpacity>
  );
}

function MetricPanel({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <View className="min-h-28 flex-1 rounded-2xl border border-border bg-surface p-4">
      <Icon size={22} color={colors.primary.DEFAULT} />
      <Text className="mt-3 text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="text-sm font-bold text-text-secondary">{label}</Text>
      <Text className="mt-1 text-xs font-semibold text-text-muted">{helper}</Text>
    </View>
  );
}

function MetricLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between border-b border-border py-3 last:border-b-0">
      <Text className="mr-4 flex-1 text-text-secondary">{label}</Text>
      <Text className="font-extrabold text-text-primary">{value}</Text>
    </View>
  );
}
