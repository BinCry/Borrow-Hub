import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Banknote, ChevronLeft, RefreshCcw } from 'lucide-react-native';
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
  AdminPayment,
  AdminPayout,
  AdminPayoutStatus,
  AdminRefundStatus,
  AdminService,
} from '../../services/admin/admin.service';
import { getStatusLabel, getPaymentMethodLabel } from '../../utils/status-labels';
import { parseThousandsVnd } from '../../utils/money-input';
import { visibleFinancePayments } from '../../services/finance/payment-visibility';
import { colors } from '../../theme/colors';

type FinanceTab = 'payments' | 'payouts';

const payoutStatuses: AdminPayoutStatus[] = ['PENDING', 'SCHEDULED', 'PAID', 'BLOCKED', 'CANCELLED'];
const refundStatuses: AdminRefundStatus[] = ['COMPLETED', 'FAILED', 'REJECTED'];

function financeLabel(status: string) {
  return getStatusLabel(status);
}

function formatMoney(value: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminFinanceScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<FinanceTab>('payments');
  const paymentsQuery = useQuery({
    queryKey: ['admin', 'finance', 'payments'],
    queryFn: () => AdminService.listPayments(),
  });
  const payoutsQuery = useQuery({
    queryKey: ['admin', 'finance', 'payouts'],
    queryFn: () => AdminService.listPayouts(),
  });
  const activeLoading = tab === 'payments' ? paymentsQuery.isLoading : payoutsQuery.isLoading;
  const activeError = tab === 'payments' ? paymentsQuery.isError : payoutsQuery.isError;
  const activeRefetch = tab === 'payments' ? paymentsQuery.refetch : payoutsQuery.refetch;
  const activeRefreshing = tab === 'payments' ? paymentsQuery.isRefetching : payoutsQuery.isRefetching;

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
          Tài chính
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void activeRefetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      <View className="flex-row border-b border-border bg-surface p-3">
        <TabButton label="Thanh toán" selected={tab === 'payments'} onPress={() => setTab('payments')} />
        <TabButton label="Chi trả" selected={tab === 'payouts'} onPress={() => setTab('payouts')} />
      </View>

      {activeLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : activeError ? (
        <EmptyState
          title="Không thể tải tài chính"
          description="Kiểm tra quyền quản lý tài chính hoặc kết nối rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void activeRefetch()}
        />
      ) : tab === 'payments' ? (
        <PaymentList
          data={visibleFinancePayments(paymentsQuery.data ?? [])}
          refreshing={activeRefreshing}
          onRefresh={() => void paymentsQuery.refetch()}
        />
      ) : (
        <PayoutList
          data={payoutsQuery.data ?? []}
          refreshing={activeRefreshing}
          onRefresh={() => void payoutsQuery.refetch()}
        />
      )}
    </SafeAreaView>
  );
}

function TabButton({
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
      <TouchableOpacity className="mr-2 flex-1 rounded-xl bg-primary py-3" onPress={onPress}>
        <Text className="text-center font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity className="mr-2 flex-1 rounded-xl border border-border bg-surface py-3" onPress={onPress}>
      <Text className="text-center font-extrabold text-text-secondary">{label}</Text>
    </TouchableOpacity>
  );
}

function PaymentList({
  data,
  refreshing,
  onRefresh,
}: {
  data: AdminPayment[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <Text className="mb-3 text-sm font-bold text-text-secondary">{data.length} giao dịch</Text>
      }
      ListEmptyComponent={
        <EmptyState
          title="Chưa có giao dịch thanh toán"
          description="Đơn đang chờ chi trả không hiển thị tại đây. Admin có thể xử lý trong mục Chi trả."
        />
      }
      renderItem={({ item }) => <PaymentCard payment={item} />}
    />
  );
}

function PaymentCard({ payment }: { payment: AdminPayment }) {
  const queryClient = useQueryClient();
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const refundableBalance = payment.amount - payment.refunds
    .filter((refund) => refund.status === 'PENDING' || refund.status === 'COMPLETED')
    .reduce((sum, refund) => sum + refund.amount, 0);
  const parsedRefundAmount = parseThousandsVnd(refundAmount);
  const refundMutation = useMutation({
    mutationFn: (amount: number) =>
      AdminService.createRefund(payment.id, {
        amount,
        reason: refundReason.trim(),
      }),
    onSuccess: () => {
      setRefundAmount('');
      setRefundReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể tạo khoản hoàn tiền', 'Kiểm tra số tiền, trạng thái giao dịch hoặc quyền tài chính.');
    },
  });
  const refundStatusMutation = useMutation({
    mutationFn: ({ refundId, status }: { refundId: string; status: AdminRefundStatus }) =>
      AdminService.updateRefundStatus(refundId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật khoản hoàn tiền', 'Chỉ khoản hoàn tiền đang chờ mới có thể cập nhật.');
    },
  });

  const createRefund = () => {
    const amount = parseThousandsVnd(refundAmount);
    if (amount === null || amount <= 0 || !refundReason.trim()) {
      Alert.alert('Thiếu thông tin', 'Nhập khoản hoàn bằng nghìn VND và lý do.');
      return;
    }
    if (amount > refundableBalance) {
      Alert.alert('Vượt số tiền có thể hoàn', `Bạn chỉ có thể hoàn tối đa ${formatMoney(refundableBalance, payment.currency)}.`);
      return;
    }
    Alert.alert('Tạo khoản hoàn tiền?', `${formatMoney(amount, payment.currency)} sẽ được ghi nhận.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Tạo', onPress: () => refundMutation.mutate(amount) },
    ]);
  };

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
          <Banknote size={24} color={colors.primary.DEFAULT} />
        </View>
        <View className="min-w-0 flex-1">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-base font-extrabold text-text-primary">
                {payment.rental.asset.title}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary">
                {payment.payer?.fullName ?? payment.payerId} → {payment.rental.owner.fullName}
              </Text>
            </View>
            <StatusBadge label={financeLabel(payment.status)} tone={payment.status === 'SUCCESS' ? 'success' : payment.status === 'FAILED' ? 'danger' : 'muted'} />
          </View>
          <InfoLine label="Số tiền" value={formatMoney(payment.amount, payment.currency)} />
          <InfoLine label="Phương thức thanh toán" value={getPaymentMethodLabel(payment.provider)} />
          <InfoLine label="Thanh toán lúc" value={formatDate(payment.paidAt)} />
        </View>
      </View>

      <View className="mt-4 rounded-xl bg-surface-secondary p-3">
        <Text className="mb-2 text-xs font-extrabold text-text-secondary">
          Khoản hoàn tiền
        </Text>
        {payment.refunds.length ? (
          payment.refunds.map((refund) => (
            <View key={refund.id} className="mb-3 rounded-xl border border-border bg-surface p-3">
              <InfoLine label={formatMoney(refund.amount, payment.currency)} value={financeLabel(refund.status)} />
              <Text className="mt-1 text-sm text-text-secondary">{refund.reason}</Text>
              {refund.status === 'PENDING' ? (
                <View className="mt-3 flex-row flex-wrap gap-2">
                  {refundStatuses.map((status) => (
                    <TouchableOpacity
                      key={status}
                      className="rounded-full bg-primary px-3 py-2"
                      disabled={refundStatusMutation.isPending}
                      onPress={() => refundStatusMutation.mutate({ refundId: refund.id, status })}
                    >
                      <Text className="text-xs font-extrabold text-white">{financeLabel(status)}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          ))
        ) : (
          <Text className="text-sm text-text-secondary">Chưa có khoản hoàn tiền.</Text>
        )}
      </View>

      <View className="mt-4 border-t border-border pt-4">
        <Text className="mb-2 text-xs font-extrabold text-text-secondary">
          Tạo khoản hoàn tiền
        </Text>
        <Text className="mb-2 text-sm font-semibold text-text-primary">Số tiền hoàn (nghìn VND)</Text>
        <TextInput
          className="mb-3 min-h-12 rounded-xl border border-border bg-background px-4 text-text-primary"
          keyboardType="decimal-pad"
          onChangeText={setRefundAmount}
          placeholder="Số tiền (nghìn VND)"
          placeholderTextColor={colors.text.muted}
          value={refundAmount}
        />
        <Text className="mb-3 text-xs text-text-secondary">
          {parsedRefundAmount !== null && parsedRefundAmount > 0
            ? `Sẽ hoàn ${formatMoney(parsedRefundAmount, payment.currency)}. `
            : 'Ví dụ: 150 = 150.000đ; 1,5 = 1.500đ. Không dùng dấu phân cách hàng nghìn. '}
          Còn có thể hoàn: {formatMoney(Math.max(0, refundableBalance), payment.currency)}.
        </Text>
        <TextInput
          className="min-h-20 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
          multiline
          onChangeText={setRefundReason}
          placeholder="Lý do hoàn tiền"
          placeholderTextColor={colors.text.muted}
          textAlignVertical="top"
          value={refundReason}
        />
        <TouchableOpacity
          className="mt-3 min-h-12 items-center justify-center rounded-xl bg-primary"
          disabled={refundMutation.isPending}
          onPress={createRefund}
        >
          {refundMutation.isPending ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="font-extrabold text-white">Tạo khoản hoàn tiền</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PayoutList({
  data,
  refreshing,
  onRefresh,
}: {
  data: AdminPayout[];
  refreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <Text className="mb-3 text-sm font-bold text-text-secondary">{data.length} khoản chi trả</Text>
      }
      ListEmptyComponent={
        <EmptyState
          title="Chưa có khoản chi trả"
          description="Các khoản chi trả cho chủ tài sản sẽ xuất hiện tại đây."
        />
      }
      renderItem={({ item }) => <PayoutCard payout={item} />}
    />
  );
}

function PayoutCard({ payout }: { payout: AdminPayout }) {
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: (status: AdminPayoutStatus) => AdminService.updatePayoutStatus(payout.id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'finance'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật khoản chi trả', 'Kiểm tra quyền tài chính rồi thử lại.');
    },
  });

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <Text className="text-base font-extrabold text-text-primary">
            {payout.rental.asset.title}
          </Text>
            <Text className="mt-1 text-sm text-text-secondary">
            Chủ tài sản: {payout.owner?.fullName ?? payout.ownerId}
          </Text>
        </View>
        <StatusBadge label={financeLabel(payout.status)} tone={payout.status === 'PAID' ? 'success' : payout.status === 'BLOCKED' || payout.status === 'CANCELLED' ? 'danger' : 'muted'} />
      </View>

      <View className="mt-4 rounded-xl bg-surface-secondary p-3">
        <InfoLine label="Tổng tiền" value={formatMoney(payout.grossAmount)} />
        <InfoLine label="Hoa hồng" value={formatMoney(payout.commissionAmount)} />
        <InfoLine label="Thực nhận" value={formatMoney(payout.netAmount)} />
        <InfoLine label="Chi trả lúc" value={formatDate(payout.paidAt)} />
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {payoutStatuses.map((status) => (
          <TouchableOpacity
            key={status}
            className="rounded-full bg-primary px-3 py-2"
            disabled={mutation.isPending}
            onPress={() => mutation.mutate(status)}
          >
            <Text className="text-xs font-extrabold text-white">{financeLabel(status)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between py-1">
      <Text className="mr-4 flex-1 text-sm text-text-secondary">{label}</Text>
      <Text className="max-w-[58%] text-right text-sm font-bold text-text-primary">{value}</Text>
    </View>
  );
}

function StatusBadge({ label, tone }: { label: string; tone: 'success' | 'danger' | 'muted' }) {
  if (tone === 'success') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (tone === 'danger') {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs font-extrabold text-text-secondary">{label}</Text>
    </View>
  );
}
