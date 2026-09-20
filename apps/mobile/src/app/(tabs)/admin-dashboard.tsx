import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpRight,
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
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
      <View className="border-b border-border bg-surface px-5 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-4">
            <Text className="text-xs font-extrabold uppercase text-primary">Admin console</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">Tổng quan</Text>
            <Text className="mt-1 text-sm font-semibold text-text-secondary">
              Sức khỏe vận hành và các hàng chờ cần xử lý
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Tải lại"
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-primary-soft"
            onPress={refetch}
          >
            <RefreshCcw size={21} color={colors.primary.DEFAULT} />
          </TouchableOpacity>
        </View>
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
          onUsers={() => router.push('/admin/users' as never)}
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
  onUsers,
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
  onUsers: () => void;
}) {
  const openIssues = data.risk.openDisputes + data.risk.openReports;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity
        className="mb-4 rounded-lg border border-primary/20 bg-surface p-4"
        onPress={onFinance}
      >
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-4">
            <Text className="text-xs font-extrabold uppercase text-text-secondary">
              Doanh số đang quản lý
            </Text>
            <Text className="mt-2 text-3xl font-extrabold text-text-primary">
              {formatMoney(data.finance.gmv)}
            </Text>
            <Text className="mt-2 text-sm font-semibold text-text-secondary">
              Doanh thu nền tảng {formatMoney(data.finance.platformRevenue)}
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-primary-soft">
            <Banknote size={22} color={colors.primary.DEFAULT} />
          </View>
        </View>
        <View className="mt-4 flex-row gap-2">
          <InsightPill label="Take rate" value={formatPercent(data.finance.takeRate)} />
          <InsightPill label="Refund" value={`${data.finance.refundCount}`} tone="warning" />
          <InsightPill label="Payout chặn" value={`${data.finance.blockedPayoutCount}`} tone="danger" />
        </View>
      </TouchableOpacity>

      <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
        Cần xử lý ngay
      </Text>
      <View className="mb-5 gap-3">
        <PriorityRow
          icon={ShieldCheck}
          title="Duyệt KYC"
          subtitle="Hồ sơ chờ xác thực danh tính"
          value={`${queueCounts.pendingKyc}`}
          tone="primary"
          onPress={onKyc}
        />
        <PriorityRow
          icon={ClipboardCheck}
          title="Duyệt bài đăng"
          subtitle="Tài sản mới cần kiểm tra nội dung"
          value={`${queueCounts.pendingListings}`}
          tone="info"
          onPress={onListings}
        />
        <PriorityRow
          icon={ShieldAlert}
          title="Tranh chấp mở"
          subtitle="Đơn thuê cần can thiệp vận hành"
          value={`${queueCounts.openDisputes}`}
          tone="danger"
          onPress={onDisputes}
        />
        <PriorityRow
          icon={Flag}
          title="Báo cáo mở"
          subtitle="Nội dung hoặc người dùng bị báo cáo"
          value={`${queueCounts.openReports}`}
          tone="warning"
          onPress={onReports}
        />
      </View>

      <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
        Chỉ số vận hành
      </Text>
      <View className="mb-5 flex-row flex-wrap gap-3">
        <MetricPanel
          icon={Users}
          label="Người dùng"
          value={`${data.users.total}`}
          helper={`${data.users.verified} đã KYC`}
          onPress={onUsers}
        />
        <MetricPanel
          icon={AlertTriangle}
          label="Vấn đề mở"
          value={`${openIssues}`}
          helper={`${data.risk.fraudReports} báo cáo fraud`}
          tone="danger"
          onPress={onReports}
        />
        <MetricPanel
          icon={ClipboardCheck}
          label="Listing active"
          value={`${data.marketplace.activeListings}`}
          helper={`${data.marketplace.totalRentals} đơn thuê`}
          tone="info"
          onPress={onListings}
        />
        <MetricPanel
          icon={ShieldCheck}
          label="KYC hoàn tất"
          value={formatPercent(data.users.kycCompletionRate)}
          helper="Tỷ lệ xác thực"
          onPress={onKyc}
        />
      </View>

      <View className="rounded-lg border border-border bg-surface p-4">
        <Text className="mb-2 text-xs font-extrabold uppercase text-text-secondary">
          Trạng thái đơn thuê
        </Text>
        <MetricLine label="Tổng đơn" value={`${data.marketplace.totalRentals}`} />
        <MetricLine label="Hoàn tất" value={`${data.marketplace.completedRentals}`} />
        <MetricLine label="Đã hủy" value={`${data.marketplace.cancelledRentals}`} />
        <MetricLine label="Quá hạn" value={`${data.marketplace.overdueRentals}`} />
        <MetricLine label="Tỷ lệ hoàn tất" value={formatPercent(data.marketplace.completionRate)} />
      </View>
    </ScrollView>
  );
}

function InsightPill({
  label,
  value,
  tone = 'primary',
}: {
  label: string;
  value: string;
  tone?: 'primary' | 'warning' | 'danger';
}) {
  const toneClass = {
    primary: 'bg-primary-soft',
    warning: 'bg-warning/10',
    danger: 'bg-danger/10',
  }[tone];

  return (
    <View className={`flex-1 rounded-lg px-3 py-2 ${toneClass}`}>
      <Text className="text-xs font-bold text-text-secondary">{label}</Text>
      <Text className="mt-0.5 text-sm font-extrabold text-text-primary">{value}</Text>
    </View>
  );
}

function PriorityRow({
  icon: Icon,
  title,
  subtitle,
  value,
  tone,
  onPress,
}: {
  icon: typeof ShieldCheck;
  title: string;
  subtitle: string;
  value: string;
  tone: 'primary' | 'info' | 'warning' | 'danger';
  onPress: () => void;
}) {
  const toneColor = {
    primary: colors.primary.DEFAULT,
    info: colors.info,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  const toneClass = {
    primary: 'bg-primary-soft',
    info: 'bg-info/10',
    warning: 'bg-warning/10',
    danger: 'bg-danger/10',
  }[tone];

  return (
    <TouchableOpacity className="rounded-lg border border-border bg-surface p-4" onPress={onPress}>
      <View className="flex-row items-center">
        <View className={`mr-3 h-11 w-11 items-center justify-center rounded-full ${toneClass}`}>
          <Icon size={22} color={toneColor} />
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-text-primary">{title}</Text>
          <Text className="mt-0.5 text-sm font-semibold text-text-secondary">{subtitle}</Text>
        </View>
        <View className="ml-3 flex-row items-center">
          <Text className="mr-2 text-xl font-extrabold text-text-primary">{value}</Text>
          <ArrowUpRight size={18} color={colors.text.secondary} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MetricPanel({
  icon: Icon,
  label,
  value,
  helper,
  tone = 'primary',
  onPress,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper: string;
  tone?: 'primary' | 'info' | 'danger';
  onPress?: () => void;
}) {
  const toneColor = {
    primary: colors.primary.DEFAULT,
    info: colors.info,
    danger: colors.danger,
  }[tone];

  const content = (
    <>
      <Icon size={22} color={toneColor} />
      <Text className="mt-3 text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="mt-0.5 text-sm font-bold text-text-secondary">{label}</Text>
      <Text className="mt-1 text-xs font-semibold text-text-muted">{helper}</Text>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity
        className="min-h-28 w-[47%] rounded-lg border border-border bg-surface p-4"
        onPress={onPress}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return (
    <View className="min-h-28 w-[47%] rounded-lg border border-border bg-surface p-4">
      {content}
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
