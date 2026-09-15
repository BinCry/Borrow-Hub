import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Activity,
  AlertTriangle,
  Banknote,
  ChevronLeft,
  Flag,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Star,
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
import { apiClient } from '../../services/api/client';
import { AdminDashboard, AdminService } from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';
import type { User } from '../../types/domain';

function isAdmin(user?: User) {
  return user?.roles?.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN') ?? false;
}

function isSuperAdmin(user?: User) {
  return user?.roles?.includes('SUPER_ADMIN') ?? false;
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminDashboardScreen() {
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: AdminService.getDashboard,
    enabled: isAdmin(meQuery.data),
  });

  const refetch = () => {
    void meQuery.refetch();
    void dashboardQuery.refetch();
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
          Quản trị
        </Text>
        <View className="w-11" />
      </View>

      {meQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : !isAdmin(meQuery.data) ? (
        <EmptyState
          title="Không có quyền quản trị"
          description="Tài khoản này chưa được gán vai trò ADMIN hoặc SUPER_ADMIN."
          buttonText="Quay lại"
          onPress={() => router.back()}
        />
      ) : dashboardQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : dashboardQuery.isError || !dashboardQuery.data ? (
        <EmptyState
          title="Không thể tải bảng điều khiển"
          description="Kiểm tra kết nối hoặc quyền tài khoản rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void dashboardQuery.refetch()}
        />
      ) : (
        <DashboardContent
          data={dashboardQuery.data}
          canCreateStaff={isSuperAdmin(meQuery.data)}
          refreshing={dashboardQuery.isRefetching || meQuery.isRefetching}
          onRefresh={refetch}
          onUsersPress={() => router.push('/admin/users' as any)}
          onKycPress={() => router.push('/admin/kyc' as any)}
          onListingsPress={() => router.push('/admin/listings' as any)}
          onDisputesPress={() => router.push('/admin/disputes' as any)}
          onReviewsPress={() => router.push('/admin/reviews' as any)}
          onReportsPress={() => router.push('/admin/reports' as any)}
          onFinancePress={() => router.push('/admin/finance' as any)}
          onCreateStaffPress={() => router.push('/admin/create-user' as any)}
        />
      )}
    </SafeAreaView>
  );
}

function DashboardContent({
  data,
  canCreateStaff,
  refreshing,
  onRefresh,
  onUsersPress,
  onKycPress,
  onListingsPress,
  onDisputesPress,
  onReviewsPress,
  onReportsPress,
  onFinancePress,
  onCreateStaffPress,
}: {
  data: AdminDashboard;
  canCreateStaff: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onUsersPress: () => void;
  onKycPress: () => void;
  onListingsPress: () => void;
  onDisputesPress: () => void;
  onReviewsPress: () => void;
  onReportsPress: () => void;
  onFinancePress: () => void;
  onCreateStaffPress: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View className="mb-5 flex-row flex-wrap gap-3">
        <AdminAction
          icon={Users}
          label="Người dùng"
          value={`${data.users.total}`}
          onPress={onUsersPress}
        />
        <AdminAction
          icon={ShieldCheck}
          label="Duyệt KYC"
          value={`${data.users.total - data.users.verified}`}
          onPress={onKycPress}
        />
        <AdminAction
          icon={PackageCheck}
          label="Duyệt bài"
          value={`${data.marketplace.activeListings}`}
          onPress={onListingsPress}
        />
        <AdminAction
          icon={ShieldAlert}
          label="Tranh chấp"
          value={`${data.risk.openDisputes}`}
          onPress={onDisputesPress}
        />
        <AdminAction
          icon={Star}
          label="Review"
          value="Mod"
          onPress={onReviewsPress}
        />
        <AdminAction
          icon={Flag}
          label="Report"
          value={`${data.risk.openReports}`}
          onPress={onReportsPress}
        />
        <AdminAction
          icon={Banknote}
          label="Tài chính"
          value={formatMoney(data.finance.gmv)}
          onPress={onFinancePress}
        />
        {canCreateStaff ? (
          <AdminAction
            icon={ShieldCheck}
            label="Tạo nhân sự"
            value="Mới"
            onPress={onCreateStaffPress}
          />
        ) : null}
      </View>

      <View className="mb-5">
        <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
          Tổng quan
        </Text>
        <View className="flex-row flex-wrap gap-3">
          <MetricCard icon={Users} label="Người dùng" value={`${data.users.total}`} />
          <MetricCard
            icon={ShieldCheck}
            label="Đã KYC"
            value={`${data.users.verified}`}
            helper={formatPercent(data.users.kycCompletionRate)}
          />
          <MetricCard
            icon={Activity}
            label="Listing active"
            value={`${data.marketplace.activeListings}`}
          />
          <MetricCard
            icon={AlertTriangle}
            label="Vấn đề mở"
            value={`${data.risk.openDisputes + data.risk.openReports}`}
          />
        </View>
      </View>

      <View className="mb-5">
        <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
          Giao dịch
        </Text>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <MetricLine label="Tổng đơn thuê" value={`${data.marketplace.totalRentals}`} />
          <MetricLine label="Hoàn tất" value={`${data.marketplace.completedRentals}`} />
          <MetricLine label="Tỉ lệ hoàn tất" value={formatPercent(data.marketplace.completionRate)} />
          <MetricLine label="Quá hạn" value={`${data.marketplace.overdueRentals}`} />
        </View>
      </View>

      <View>
        <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
          Tài chính
        </Text>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="mb-3 flex-row items-center">
            <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
              <Banknote size={21} color={colors.primary.DEFAULT} />
            </View>
            <View>
              <Text className="text-xs font-bold uppercase text-text-secondary">GMV</Text>
              <Text className="text-xl font-extrabold text-text-primary">
                {formatMoney(data.finance.gmv)}
              </Text>
            </View>
          </View>
          <MetricLine label="Doanh thu nền tảng" value={formatMoney(data.finance.platformRevenue)} />
          <MetricLine label="Hoàn tiền" value={formatMoney(data.finance.refundAmount)} />
          <MetricLine label="Payout đã trả" value={formatMoney(data.finance.paidOut)} />
        </View>
      </View>
    </ScrollView>
  );
}

function AdminAction({
  icon: Icon,
  label,
  value,
  onPress,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="min-h-24 w-[47%] justify-between rounded-2xl border border-border bg-surface p-4"
      onPress={onPress}
    >
      <View className="h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
        <Icon size={20} color={colors.primary.DEFAULT} />
      </View>
      <View>
        <Text className="text-lg font-extrabold text-text-primary">{value}</Text>
        <Text className="mt-0.5 text-sm font-semibold text-text-secondary">{label}</Text>
      </View>
    </TouchableOpacity>
  );
}

function MetricCard({
  icon: Icon,
  label,
  value,
  helper,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  helper?: string;
}) {
  return (
    <View className="min-h-28 w-[47%] rounded-2xl border border-border bg-surface p-4">
      <View className="mb-3 h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
        <Icon size={19} color={colors.primary.DEFAULT} />
      </View>
      <Text className="text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="mt-1 text-sm font-semibold text-text-secondary">{label}</Text>
      {helper ? <Text className="mt-1 text-xs font-bold text-primary">{helper}</Text> : null}
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
