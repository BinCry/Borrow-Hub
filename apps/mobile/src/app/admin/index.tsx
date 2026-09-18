import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  Banknote,
  ChevronLeft,
  Flag,
  PackageCheck,
  ShieldAlert,
  ShieldCheck,
  Star,
  UserPlus,
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
  const queueCounts = useAdminQueueCounts({ enabled: isAdmin(meQuery.data) });

  const refetch = () => {
    void meQuery.refetch();
    void dashboardQuery.refetch();
    queueCounts.refetch();
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-surface px-4 pb-4 pt-3">
        <View className="flex-row items-center">
          <TouchableOpacity
            accessibilityLabel="Quay lại"
            className="mr-2 min-h-11 min-w-11 items-center justify-center rounded-full bg-surfaceSecondary"
            onPress={() => router.back()}
          >
            <ChevronLeft size={26} color={colors.text.primary} />
          </TouchableOpacity>
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-extrabold uppercase text-primary">Admin console</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">Quản trị</Text>
            <Text className="mt-1 text-sm font-semibold text-text-secondary">
              Điều phối người dùng, kiểm duyệt và tài chính
            </Text>
          </View>
        </View>
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
          queueCounts={queueCounts.counts}
          canCreateStaff={isSuperAdmin(meQuery.data)}
          refreshing={dashboardQuery.isRefetching || meQuery.isRefetching || queueCounts.isRefetching}
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
  queueCounts,
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
  queueCounts: ReturnType<typeof useAdminQueueCounts>['counts'];
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
      contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity
        className="mb-4 rounded-lg border border-primary/20 bg-surface p-4"
        onPress={onFinancePress}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
            <Banknote size={24} color={colors.primary.DEFAULT} />
          </View>
          <View className="min-w-0 flex-1">
            <Text className="text-xs font-extrabold uppercase text-text-secondary">GMV</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">
              {formatMoney(data.finance.gmv)}
            </Text>
            <Text className="mt-1 text-sm font-semibold text-text-secondary">
              Doanh thu nền tảng {formatMoney(data.finance.platformRevenue)}
            </Text>
          </View>
          <ArrowUpRight size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
        Lối tắt quản trị
      </Text>
      <View className="mb-5 gap-3">
        <AdminAction icon={Users} label="Người dùng" value={`${data.users.total}`} onPress={onUsersPress} />
        <AdminAction
          icon={ShieldCheck}
          label="Duyệt KYC"
          value={`${queueCounts.pendingKyc}`}
          onPress={onKycPress}
        />
        <AdminAction
          icon={PackageCheck}
          label="Duyệt bài"
          value={`${queueCounts.pendingListings}`}
          onPress={onListingsPress}
        />
        <AdminAction
          icon={ShieldAlert}
          label="Tranh chấp"
          value={`${queueCounts.openDisputes}`}
          tone="danger"
          onPress={onDisputesPress}
        />
        <AdminAction icon={Star} label="Review" value="Mod" onPress={onReviewsPress} />
        <AdminAction
          icon={Flag}
          label="Report"
          value={`${queueCounts.openReports}`}
          tone="warning"
          onPress={onReportsPress}
        />
        {canCreateStaff ? (
          <AdminAction icon={UserPlus} label="Tạo nhân sự" value="Mới" onPress={onCreateStaffPress} />
        ) : null}
      </View>
    </ScrollView>
  );
}

function AdminAction({
  icon: Icon,
  label,
  value,
  tone = 'primary',
  onPress,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: 'primary' | 'warning' | 'danger';
  onPress: () => void;
}) {
  const toneColor = {
    primary: colors.primary.DEFAULT,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];
  const toneClass = {
    primary: 'bg-primary-soft',
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
          <Text className="text-base font-extrabold text-text-primary">{label}</Text>
          <Text className="mt-0.5 text-sm font-semibold text-text-secondary">{value}</Text>
        </View>
        <ArrowUpRight size={18} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
}
