import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, RefreshCw, WalletCards } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import { OwnerFinanceService, OwnerPayout } from '../../services/finance/owner-finance.service';
import { buildOwnerEarnings, EarningsMonth } from '../../services/finance/owner-earnings';
import { colors } from '../../theme/colors';

const money = (amount: number) => `${new Intl.NumberFormat('vi-VN').format(amount)}đ`;
const compactMoney = (amount: number) => amount >= 1_000_000
  ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(amount / 1_000_000)}tr`
  : amount >= 1_000
    ? `${new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 }).format(amount / 1_000)}k`
    : new Intl.NumberFormat('vi-VN').format(amount);

const payoutLabels: Record<OwnerPayout['status'], string> = {
  PENDING: 'Chờ chi trả',
  SCHEDULED: 'Đã lên lịch',
  PAID: 'Đã chi trả',
  BLOCKED: 'Tạm giữ',
  CANCELLED: 'Đã hủy',
};

export default function OwnerEarningsScreen() {
  const router = useRouter();
  const [monthCount, setMonthCount] = useState<6 | 12>(6);
  const [selectedMonthKey, setSelectedMonthKey] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'PAID' | 'UPCOMING' | 'BLOCKED'>('PAID');
  const payoutsQuery = useQuery({
    queryKey: ['owner', 'payouts'],
    queryFn: OwnerFinanceService.listMyPayouts,
    refetchOnMount: 'always',
  });
  const payouts = payoutsQuery.data ?? [];
  const overview = buildOwnerEarnings(payouts, new Date(), monthCount);
  const selectedMonth = overview.months.find((month) => month.key === selectedMonthKey)
    ?? overview.months[overview.months.length - 1];
  const visiblePayouts = payouts.filter((item) =>
    historyFilter === 'ALL' || item.status === historyFilter ||
    (historyFilter === 'UPCOMING' && (item.status === 'PENDING' || item.status === 'SCHEDULED')));

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity accessibilityLabel="Quay lại" className="min-h-11 min-w-11 items-center justify-center" onPress={() => router.back()}>
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-text-primary">Doanh thu cho thuê</Text>
        <TouchableOpacity accessibilityLabel="Tải lại" className="min-h-11 min-w-11 items-center justify-center" onPress={() => void payoutsQuery.refetch()}>
          <RefreshCw size={20} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {payoutsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color={colors.primary.DEFAULT} /></View>
      ) : payoutsQuery.isError ? (
        <EmptyState title="Không thể tải doanh thu" description="Kiểm tra kết nối rồi thử lại." buttonText="Thử lại" onPress={() => void payoutsQuery.refetch()} />
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 36 }}
          refreshControl={<RefreshControl refreshing={payoutsQuery.isRefetching} onRefresh={() => void payoutsQuery.refetch()} />}
        >
          <View className="rounded-2xl bg-primary p-5">
            <View className="flex-row items-center"><WalletCards size={22} color="white" /><Text className="ml-2 font-bold text-white">Đã chi trả cho bạn</Text></View>
            <Text className="mt-3 text-3xl font-extrabold text-white">{money(overview.paid)}</Text>
            <Text className="mt-1 text-sm text-white/80">{overview.paidCount} khoản đã nhận · Số tiền sau hoa hồng</Text>
          </View>

          <EarningsChart
            months={overview.months}
            selectedMonth={selectedMonth}
            monthCount={monthCount}
            onMonthCountChange={(count) => { setMonthCount(count); setSelectedMonthKey(null); }}
            onMonthSelect={setSelectedMonthKey}
          />

          <Text className="mt-5 text-base font-extrabold text-text-primary">Chưa tính vào doanh thu</Text>
          <Text className="mt-1 text-sm text-text-secondary">Các khoản này chưa được chi trả cho bạn.</Text>
          <View className="mt-3 flex-row gap-3">
            <SummaryCard label="Chờ chi trả" amount={overview.upcoming} />
            <SummaryCard label="Tạm giữ" amount={overview.blocked} />
          </View>

          <Text className="mb-3 mt-6 text-base font-extrabold text-text-primary">Lịch sử chi trả</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3" contentContainerStyle={{ gap: 8 }}>
            {([
              ['ALL', 'Tất cả'], ['PAID', 'Đã nhận'], ['UPCOMING', 'Chờ chi trả'], ['BLOCKED', 'Tạm giữ'],
            ] as const).map(([value, label]) => (
              <TouchableOpacity key={value} onPress={() => setHistoryFilter(value)} accessibilityRole="button"
                accessibilityState={{ selected: historyFilter === value }}
                className={`rounded-full px-4 py-2 ${historyFilter === value ? 'bg-primary' : 'border border-border bg-surface'}`}>
                <Text className={`font-semibold ${historyFilter === value ? 'text-white' : 'text-text-secondary'}`}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {visiblePayouts.length ? visiblePayouts.map((item) => (
            <View key={item.id} className="mb-3 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-start justify-between gap-3">
                <Text className="min-w-0 flex-1 font-extrabold text-text-primary">{item.rental.asset.title}</Text>
                <Text className="text-xs font-bold text-primary">{payoutLabels[item.status]}</Text>
              </View>
              <Text className="mt-2 text-sm text-text-secondary">
                {item.status === 'PAID' ? 'Chi trả: ' : item.status === 'SCHEDULED' && item.scheduledAt ? 'Dự kiến: ' : 'Tạo: '}
                {new Intl.DateTimeFormat('vi-VN').format(new Date(
                  item.status === 'PAID' ? (item.paidAt ?? item.updatedAt ?? item.createdAt)
                    : item.status === 'SCHEDULED' ? (item.scheduledAt ?? item.createdAt) : item.createdAt,
                ))}
              </Text>
              <View className="mt-3 flex-row justify-between"><Text className="text-text-secondary">Tiền thuê</Text><Text className="font-semibold text-text-primary">{money(item.grossAmount)}</Text></View>
              <View className="mt-1 flex-row justify-between"><Text className="text-text-secondary">Hoa hồng</Text><Text className="font-semibold text-text-primary">−{money(item.commissionAmount)}</Text></View>
              <View className="mt-2 flex-row justify-between border-t border-border pt-2">
                <Text className="font-bold text-text-primary">
                  {item.status === 'PAID' ? 'Đã nhận' : item.status === 'CANCELLED' ? 'Không chi trả' : item.status === 'BLOCKED' ? 'Đang tạm giữ' : 'Dự kiến nhận'}
                </Text>
                <Text className={`font-extrabold ${item.status === 'CANCELLED' ? 'text-text-muted' : 'text-primary'}`}>
                  {item.status === 'CANCELLED' ? money(0) : money(item.netAmount)}
                </Text>
              </View>
            </View>
          )) : (
            <View className="items-center rounded-2xl border border-border bg-surface px-5 py-8">
              <WalletCards size={38} color={colors.text.muted} />
              <Text className="mt-3 font-bold text-text-primary">Chưa có khoản chi trả</Text>
              <Text className="mt-1 text-center text-sm text-text-secondary">
                {payouts.length ? 'Không có khoản chi trả ở trạng thái này.' : 'Khoản chi trả sẽ xuất hiện sau khi đơn thuê được thanh toán.'}
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function SummaryCard({ label, amount }: { label: string; amount: number }) {
  return (
    <View className="min-w-0 flex-1 rounded-2xl border border-border bg-surface p-4">
      <Text className="text-sm font-semibold text-text-secondary">{label}</Text>
      <Text className="mt-2 text-xl font-extrabold text-text-primary" numberOfLines={1} adjustsFontSizeToFit>{money(amount)}</Text>
    </View>
  );
}

function EarningsChart({ months, selectedMonth, monthCount, onMonthCountChange, onMonthSelect }: {
  months: EarningsMonth[];
  selectedMonth: EarningsMonth;
  monthCount: 6 | 12;
  onMonthCountChange: (count: 6 | 12) => void;
  onMonthSelect: (key: string) => void;
}) {
  const maxValue = Math.max(...months.map((month) => month.paid), 0);
  const chartMax = maxValue || 1;

  return (
    <View className="mt-5 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-center justify-between gap-2">
        <Text className="min-w-0 flex-1 text-base font-extrabold text-text-primary">Đã nhận theo tháng</Text>
        <View className="flex-row rounded-lg bg-surface-secondary p-1">
          {([6, 12] as const).map((count) => (
            <TouchableOpacity key={count} accessibilityRole="button" accessibilityState={{ selected: monthCount === count }}
              onPress={() => onMonthCountChange(count)} className={`rounded-md px-3 py-1 ${monthCount === count ? 'bg-primary' : ''}`}>
              <Text className={`text-xs font-bold ${monthCount === count ? 'text-white' : 'text-text-secondary'}`}>{count} tháng</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      <Text className="mt-1 text-sm text-text-secondary">Chỉ gồm các khoản đã chi trả, sau hoa hồng.</Text>

      <View className="mt-4 flex-row">
        <View className="mr-2 h-36 justify-between pb-5">
          <Text className="text-[10px] text-text-muted">{compactMoney(maxValue)}</Text>
          <Text className="text-[10px] text-text-muted">{compactMoney(Math.round(maxValue / 2))}</Text>
          <Text className="text-[10px] text-text-muted">0</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={monthCount === 12} className="min-w-0 flex-1"
          contentContainerStyle={{ flexGrow: 1 }}>
          {months.map((month) => (
            <TouchableOpacity key={month.key} accessibilityRole="button"
              accessibilityLabel={`${month.label}: đã nhận ${money(month.paid)}`}
              accessibilityState={{ selected: month.key === selectedMonth.key }}
              onPress={() => onMonthSelect(month.key)}
              style={{ width: monthCount === 12 ? 55 : undefined, flex: monthCount === 6 ? 1 : undefined }}
              className="items-center justify-end px-1">
              <View className="h-28 w-full flex-row items-end justify-center border-b border-border">
                <View className="w-5 rounded-t-sm bg-primary" style={{ height: month.paid ? Math.max(4, month.paid / chartMax * 110) : 0 }} />
              </View>
              <Text className={`mt-2 text-[10px] ${month.key === selectedMonth.key ? 'font-extrabold text-primary' : 'font-medium text-text-secondary'}`}>
                {month.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
      {maxValue === 0 ? <Text className="mt-3 text-center text-sm text-text-secondary">Chưa có khoản đã chi trả trong giai đoạn này.</Text> : null}
      <View className="mt-4 rounded-xl bg-surface-secondary p-3">
        <Text className="font-bold text-text-primary">{selectedMonth.label}</Text>
        <View className="mt-2 flex-row justify-between"><Text className="text-sm text-text-secondary">Đã nhận</Text><Text className="text-sm font-bold text-primary">{money(selectedMonth.paid)}</Text></View>
      </View>
      <Text className="mt-3 text-xs leading-5 text-text-secondary">Tính theo ngày chi trả. Đơn đang chờ và khoản tạm giữ không được cộng vào biểu đồ.</Text>
    </View>
  );
}
