import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  ArrowUpRight,
  FileCheck2,
  Flag,
  PackageCheck,
  RefreshCcw,
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
import { useAdminQueueCounts } from '../../hooks/useAdminQueueCounts';
import { AdminDashboard, AdminService } from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

export default function AdminModerationTab() {
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
            <Text className="text-xs font-extrabold uppercase text-primary">Kiểm duyệt</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">
              Hàng chờ nội dung
            </Text>
            <Text className="mt-1 text-sm font-semibold text-text-secondary">
              KYC, bài đăng, review và báo cáo cần quyết định
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
          title="Không thể tải hàng chờ"
          description="Kiểm tra kết nối hoặc quyền tài khoản rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void dashboardQuery.refetch()}
        />
      ) : (
        <ModerationContent
          data={dashboardQuery.data}
          queueCounts={queueCounts.counts}
          refreshing={dashboardQuery.isRefetching || queueCounts.isRefetching}
          onRefresh={refetch}
          onKyc={() => router.push('/admin/kyc' as never)}
          onListings={() => router.push('/admin/listings' as never)}
          onReviews={() => router.push('/admin/reviews' as never)}
          onReports={() => router.push('/admin/reports' as never)}
          onUsers={() => router.push('/admin/users' as never)}
        />
      )}
    </SafeAreaView>
  );
}

function ModerationContent({
  data,
  queueCounts,
  refreshing,
  onRefresh,
  onKyc,
  onListings,
  onReviews,
  onReports,
  onUsers,
}: {
  data: AdminDashboard;
  queueCounts: ReturnType<typeof useAdminQueueCounts>['counts'];
  refreshing: boolean;
  onRefresh: () => void;
  onKyc: () => void;
  onListings: () => void;
  onReviews: () => void;
  onReports: () => void;
  onUsers: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <QueueCard
        icon={ShieldCheck}
        title="Xác thực danh tính"
        description="Đối chiếu giấy tờ, ảnh selfie và cập nhật trạng thái verified/rejected."
        count={`${queueCounts.pendingKyc}`}
        meta="KYC"
        tone="primary"
        onPress={onKyc}
      />
      <QueueCard
        icon={PackageCheck}
        title="Bài đăng chờ duyệt"
        description="Kiểm tra mô tả, hình ảnh, giá thuê và trạng thái tài sản trước khi xuất hiện."
        count={`${queueCounts.pendingListings}`}
        meta="Listing"
        tone="info"
        onPress={onListings}
      />
      <QueueCard
        icon={Flag}
        title="Báo cáo mở"
        description="Xử lý báo cáo người dùng, bài đăng, review hoặc tin nhắn có dấu hiệu vi phạm."
        count={`${queueCounts.openReports}`}
        meta="Report"
        tone="warning"
        onPress={onReports}
      />
      <QueueCard
        icon={Star}
        title="Review cần kiểm duyệt"
        description="Ẩn hoặc khôi phục đánh giá không phù hợp, bị báo cáo hoặc thiếu ngữ cảnh."
        count="Mod"
        meta="Review"
        tone="primary"
        onPress={onReviews}
      />
      <QueueCard
        icon={Users}
        title="Người dùng"
        description="Xem vai trò, trạng thái tài khoản, điểm tin cậy và quyết định suspend/ban."
        count={`${data.users.total}`}
        meta={`${data.users.suspended + data.users.banned} hạn chế`}
        tone="danger"
        onPress={onUsers}
      />
    </ScrollView>
  );
}

function QueueCard({
  icon: Icon,
  title,
  description,
  count,
  meta,
  tone,
  onPress,
}: {
  icon: typeof FileCheck2;
  title: string;
  description: string;
  count: string;
  meta: string;
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
    <TouchableOpacity className="mb-3 rounded-lg border border-border bg-surface p-4" onPress={onPress}>
      <View className="flex-row items-start">
        <View className={`mr-3 h-12 w-12 items-center justify-center rounded-full ${toneClass}`}>
          <Icon size={24} color={toneColor} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-extrabold text-text-primary">{title}</Text>
              <Text className="mt-1 text-xs font-bold uppercase text-text-muted">{meta}</Text>
            </View>
            <View className="min-w-12 items-center rounded-full bg-surfaceSecondary px-3 py-1">
              <Text className="text-xs font-extrabold text-text-primary">{count}</Text>
            </View>
          </View>
          <Text className="mt-2 leading-5 text-text-secondary">{description}</Text>
        </View>
        <ArrowUpRight size={18} color={colors.text.secondary} />
      </View>
    </TouchableOpacity>
  );
}
