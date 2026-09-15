import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
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
      <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
        <View>
          <Text className="text-2xl font-extrabold text-text-primary">Kiểm duyệt</Text>
          <Text className="mt-0.5 text-sm font-semibold text-text-secondary">
            KYC, bài đăng, review và report
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
        title="Duyệt xác thực danh tính"
        description="Xem hồ sơ KYC, đối chiếu giấy tờ và quyết định verified/rejected."
        count={`${queueCounts.pendingKyc}`}
        onPress={onKyc}
      />
      <QueueCard
        icon={PackageCheck}
        title="Duyệt bài đăng"
        description="Kiểm tra tài sản, nội dung, ảnh và trạng thái bài đăng."
        count={`${queueCounts.pendingListings}`}
        onPress={onListings}
      />
      <QueueCard
        icon={Flag}
        title="Kiểm duyệt report"
        description="Xử lý báo cáo user, bài đăng, review hoặc tin nhắn."
        count={`${queueCounts.openReports}`}
        onPress={onReports}
      />
      <QueueCard
        icon={Star}
        title="Kiểm duyệt review"
        description="Ẩn/hiện đánh giá không phù hợp hoặc bị báo cáo."
        count="Mod"
        onPress={onReviews}
      />
      <QueueCard
        icon={Users}
        title="Quản lý người dùng"
        description="Xem vai trò, trạng thái tài khoản và xử lý suspend/ban."
        count={`${data.users.total}`}
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
  onPress,
}: {
  icon: typeof FileCheck2;
  title: string;
  description: string;
  count: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="mb-3 rounded-2xl border border-border bg-surface p-4" onPress={onPress}>
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
          <Icon size={24} color={colors.primary.DEFAULT} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <Text className="mr-3 flex-1 text-base font-extrabold text-text-primary">
              {title}
            </Text>
            <View className="rounded-full bg-surfaceSecondary px-3 py-1">
              <Text className="text-xs font-extrabold text-text-primary">{count}</Text>
            </View>
          </View>
          <Text className="mt-2 leading-5 text-text-secondary">{description}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
