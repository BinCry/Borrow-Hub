import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, CreditCard, ShieldCheck } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RentalsService } from '../../../services/rentals/rentals.service';
import { colors } from '../../../theme/colors';

const currencyFormatter = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

function formatRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export default function PaymentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [now, setNow] = useState(0);
  const intentQuery = useQuery({
    queryKey: ['rentals', 'payment-intent', id],
    queryFn: () => RentalsService.getPaymentIntent(id),
    enabled: Boolean(id),
    refetchInterval: (query) =>
      query.state.data?.paymentProvider === 'SEPAY' && query.state.data.isPayable
        ? 5_000
        : false,
  });
  const sandboxMutation = useMutation({
    mutationFn: () => RentalsService.settleSandboxPayment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      Alert.alert('Thanh toán thành công', 'Đơn thuê đã chuyển sang bước ký hợp đồng.');
      router.back();
    },
    onError: () => {
      Alert.alert('Thanh toán thất bại', 'Không thể xử lý thanh toán thử nghiệm.');
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  const intent = intentQuery.data;
  const remaining = intent?.expiresAt
    ? new Date(intent.expiresAt).getTime() - now
    : 0;

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
          Thanh toán
        </Text>
        <View className="w-11" />
      </View>

      {intentQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : intentQuery.isError || !intent ? (
        <View className="flex-1 items-center justify-center px-6">
          <CreditCard size={56} color={colors.text.muted} />
          <Text className="mt-4 text-center text-lg font-bold text-text-primary">
            Không thể tạo yêu cầu thanh toán
          </Text>
          <Text className="mt-2 text-center text-text-secondary">
            Phiên thanh toán có thể đã hết hạn hoặc đơn thuê không còn ở trạng thái chờ thanh toán.
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-12 rounded-xl bg-primary px-8 items-center justify-center"
            onPress={() => void intentQuery.refetch()}
          >
            <Text className="font-bold text-white">Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : !intent.isPayable ? (
        <View className="flex-1 items-center justify-center px-6">
          <CheckCircle2 size={64} color={colors.success} />
          <Text className="mt-4 text-xl font-bold text-text-primary">
            Không còn khoản cần thanh toán
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-12 w-full items-center justify-center rounded-xl bg-primary"
            onPress={() => router.back()}
          >
            <Text className="font-bold text-white">Về chi tiết đơn thuê</Text>
          </TouchableOpacity>
        </View>
      ) : intent.paymentProvider === 'SEPAY' ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
        >
          <View className="items-center">
            <View className="mb-4 flex-row items-center rounded-full bg-primary-soft px-4 py-2">
              <ShieldCheck size={16} color={colors.primary.DEFAULT} />
              <Text className="ml-2 font-semibold text-primary">Đối soát tự động qua SePay</Text>
            </View>
            <Text className="text-center text-3xl font-extrabold text-text-primary">
              {currencyFormatter.format(intent.amountDue)}
            </Text>
            <Text className="mt-2 text-text-secondary">
              Thời gian còn lại: {now === 0 ? '--:--' : formatRemaining(remaining)}
            </Text>
          </View>

          {intent.qrUrl ? (
            <View className="mx-auto my-6 overflow-hidden rounded-3xl border border-border bg-white p-3 shadow-sm">
              <Image
                source={{ uri: intent.qrUrl }}
                style={{ width: 280, height: 280 }}
                contentFit="contain"
              />
            </View>
          ) : null}

          <View className="rounded-2xl border border-border bg-surface p-5">
            <Text className="mb-4 text-lg font-bold text-text-primary">
              Thông tin chuyển khoản
            </Text>
            <Text className="text-xs uppercase tracking-wider text-text-muted">Ngân hàng</Text>
            <Text className="mb-3 mt-1 font-semibold text-text-primary" selectable>
              {intent.bankAccount?.bankName}
            </Text>
            <Text className="text-xs uppercase tracking-wider text-text-muted">Số tài khoản</Text>
            <Text className="mb-3 mt-1 text-lg font-bold text-primary" selectable>
              {intent.bankAccount?.accountNumber}
            </Text>
            <Text className="text-xs uppercase tracking-wider text-text-muted">Chủ tài khoản</Text>
            <Text className="mb-3 mt-1 font-semibold text-text-primary" selectable>
              {intent.bankAccount?.accountName}
            </Text>
            <Text className="text-xs uppercase tracking-wider text-text-muted">Nội dung</Text>
            <Text className="mt-1 text-lg font-extrabold text-primary" selectable>
              {intent.paymentCode}
            </Text>
          </View>

          <Text className="mt-5 text-center leading-5 text-text-secondary">
            Giữ nguyên số tiền và nội dung chuyển khoản. Trạng thái đơn sẽ tự cập nhật sau khi ngân hàng xác nhận.
          </Text>
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <CreditCard size={64} color={colors.primary.DEFAULT} />
          <Text className="mt-5 text-2xl font-bold text-text-primary">
            Thanh toán thử nghiệm
          </Text>
          <Text className="mt-2 text-center leading-6 text-text-secondary">
            Sandbox chỉ được bật trong môi trường phát triển và không phát sinh giao dịch thật.
          </Text>
          <Text className="mt-6 text-3xl font-extrabold text-primary">
            {currencyFormatter.format(intent.amountDue)}
          </Text>
          <TouchableOpacity
            className={`mt-8 min-h-14 w-full items-center justify-center rounded-xl bg-primary ${
              sandboxMutation.isPending ? 'opacity-70' : ''
            }`}
            disabled={sandboxMutation.isPending}
            onPress={() => sandboxMutation.mutate()}
          >
            {sandboxMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-bold text-white">Xác nhận thanh toán sandbox</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
