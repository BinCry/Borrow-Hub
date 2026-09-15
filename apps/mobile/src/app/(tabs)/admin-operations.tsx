import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock3,
  RefreshCcw,
  ShieldAlert,
  XCircle,
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
import { AdminDashboard, AdminService } from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

export default function AdminOperationsTab() {
  const router = useRouter();
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: AdminService.getDashboard,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
        <View>
          <Text className="text-2xl font-extrabold text-text-primary">Đơn & tranh chấp</Text>
          <Text className="mt-0.5 text-sm font-semibold text-text-secondary">
            Trạng thái thuê và hồ sơ cần xử lý
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
          title="Không thể tải vận hành"
          description="Kiểm tra kết nối hoặc quyền tài khoản rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void dashboardQuery.refetch()}
        />
      ) : (
        <OperationsContent
          data={dashboardQuery.data}
          refreshing={dashboardQuery.isRefetching}
          onRefresh={() => void dashboardQuery.refetch()}
          onDisputes={() => router.push('/admin/disputes' as never)}
        />
      )}
    </SafeAreaView>
  );
}

function OperationsContent({
  data,
  refreshing,
  onRefresh,
  onDisputes,
}: {
  data: AdminDashboard;
  refreshing: boolean;
  onRefresh: () => void;
  onDisputes: () => void;
}) {
  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity
        className="mb-4 rounded-2xl border border-danger/20 bg-danger/5 p-4"
        onPress={onDisputes}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <ShieldAlert size={24} color={colors.danger} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-extrabold text-text-primary">
              {data.risk.openDisputes} tranh chấp mở
            </Text>
            <Text className="mt-1 text-text-secondary">
              Mở danh sách tranh chấp để xem bằng chứng và cập nhật kết luận.
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      <View className="mb-4 flex-row flex-wrap gap-3">
        <StatusTile icon={CalendarClock} label="Tổng đơn" value={`${data.marketplace.totalRentals}`} />
        <StatusTile icon={CheckCircle2} label="Hoàn tất" value={`${data.marketplace.completedRentals}`} />
        <StatusTile icon={XCircle} label="Đã hủy" value={`${data.marketplace.cancelledRentals}`} />
        <StatusTile icon={Clock3} label="Quá hạn" value={`${data.marketplace.overdueRentals}`} />
      </View>

      <View className="rounded-2xl border border-border bg-surface p-4">
        <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
          Chỉ số vận hành
        </Text>
        <MetricLine label="Tỉ lệ hoàn tất" value={`${Math.round(data.marketplace.completionRate * 100)}%`} />
        <MetricLine label="Tỉ lệ hủy" value={`${Math.round(data.marketplace.cancellationRate * 100)}%`} />
        <MetricLine label="Vấn đề mở" value={`${data.marketplace.openIssues}`} />
        <MetricLine label="Tỉ lệ dispute" value={`${Math.round(data.trust.disputeRate * 100)}%`} />
      </View>
    </ScrollView>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
}) {
  return (
    <View className="min-h-24 w-[47%] rounded-2xl border border-border bg-surface p-4">
      <Icon size={22} color={colors.primary.DEFAULT} />
      <Text className="mt-3 text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="text-sm font-bold text-text-secondary">{label}</Text>
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
