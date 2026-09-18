import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  ArrowUpRight,
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

function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export default function AdminOperationsTab() {
  const router = useRouter();
  const dashboardQuery = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: AdminService.getDashboard,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="border-b border-border bg-surface px-5 pb-4 pt-3">
        <View className="flex-row items-center justify-between">
          <View className="min-w-0 flex-1 pr-4">
            <Text className="text-xs font-extrabold uppercase text-primary">Vận hành</Text>
            <Text className="mt-1 text-2xl font-extrabold text-text-primary">
              Đơn & tranh chấp
            </Text>
            <Text className="mt-1 text-sm font-semibold text-text-secondary">
              Theo dõi vòng đời đơn thuê và hồ sơ cần can thiệp
            </Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Tải lại"
            className="min-h-11 min-w-11 items-center justify-center rounded-full bg-primary-soft"
            onPress={() => void dashboardQuery.refetch()}
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
  const hasOpenDisputes = data.risk.openDisputes > 0;

  return (
    <ScrollView
      className="flex-1"
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <TouchableOpacity
        className="mb-4 rounded-lg border border-danger/20 bg-surface p-4"
        onPress={onDisputes}
      >
        <View className="flex-row items-center">
          <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-danger/10">
            <ShieldAlert size={24} color={colors.danger} />
          </View>
          <View className="min-w-0 flex-1">
            <View className="flex-row items-center">
              <Text className="mr-2 text-lg font-extrabold text-text-primary">
                {data.risk.openDisputes} tranh chấp mở
              </Text>
              <StatusBadge label={hasOpenDisputes ? 'Ưu tiên' : 'Ổn định'} danger={hasOpenDisputes} />
            </View>
            <Text className="mt-1 text-sm font-semibold leading-5 text-text-secondary">
              Mở danh sách tranh chấp để xem bằng chứng, phản hồi và cập nhật kết luận.
            </Text>
          </View>
          <ArrowUpRight size={18} color={colors.text.secondary} />
        </View>
      </TouchableOpacity>

      <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
        Dòng đơn thuê
      </Text>
      <View className="mb-5 flex-row flex-wrap gap-3">
        <StatusTile icon={CalendarClock} label="Tổng đơn" value={`${data.marketplace.totalRentals}`} />
        <StatusTile
          icon={CheckCircle2}
          label="Hoàn tất"
          value={`${data.marketplace.completedRentals}`}
          tone="success"
        />
        <StatusTile
          icon={XCircle}
          label="Đã hủy"
          value={`${data.marketplace.cancelledRentals}`}
          tone="warning"
        />
        <StatusTile
          icon={Clock3}
          label="Quá hạn"
          value={`${data.marketplace.overdueRentals}`}
          tone="danger"
        />
      </View>

      <View className="rounded-lg border border-border bg-surface p-4">
        <Text className="mb-2 text-xs font-extrabold uppercase text-text-secondary">
          Chỉ số vận hành
        </Text>
        <MetricLine label="Tỷ lệ hoàn tất" value={formatPercent(data.marketplace.completionRate)} />
        <MetricLine label="Tỷ lệ hủy" value={formatPercent(data.marketplace.cancellationRate)} />
        <MetricLine label="Vấn đề mở" value={`${data.marketplace.openIssues}`} />
        <MetricLine label="Tỷ lệ dispute" value={formatPercent(data.trust.disputeRate)} />
        <MetricLine label="Trả muộn" value={formatPercent(data.trust.lateReturnRate)} />
      </View>
    </ScrollView>
  );
}

function StatusBadge({ label, danger }: { label: string; danger: boolean }) {
  return (
    <View className={`rounded-full px-2.5 py-1 ${danger ? 'bg-danger/10' : 'bg-primary-soft'}`}>
      <Text className="text-xs font-extrabold text-text-primary">{label}</Text>
    </View>
  );
}

function StatusTile({
  icon: Icon,
  label,
  value,
  tone = 'primary',
}: {
  icon: typeof AlertTriangle;
  label: string;
  value: string;
  tone?: 'primary' | 'success' | 'warning' | 'danger';
}) {
  const toneColor = {
    primary: colors.primary.DEFAULT,
    success: colors.success,
    warning: colors.warning,
    danger: colors.danger,
  }[tone];

  return (
    <View className="min-h-24 w-[47%] rounded-lg border border-border bg-surface p-4">
      <Icon size={22} color={toneColor} />
      <Text className="mt-3 text-2xl font-extrabold text-text-primary">{value}</Text>
      <Text className="mt-0.5 text-sm font-bold text-text-secondary">{label}</Text>
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
