import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ChevronLeft, CreditCard, RefreshCw } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);
  const hasObservedPayable = useRef(false);
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
      Alert.alert('Thanh toán thất bại', 'Không thể kiểm tra thanh toán. Vui lòng thử lại.');
    },
  });

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (intentQuery.data?.isPayable) {
      hasObservedPayable.current = true;
      return;
    }

    if (hasObservedPayable.current && intentQuery.data && !intentQuery.data.isPayable) {
      hasObservedPayable.current = false;
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      Alert.alert(
        'Thanh toán thành công',
        'Đơn thuê đã chuyển sang bước tiếp theo.',
        [{ text: 'Tiếp tục', onPress: () => router.back() }],
        { cancelable: false },
      );
    }
  }, [intentQuery.data, queryClient, router]);

  useEffect(() => {
    if (intentQuery.isError) {
      void queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    }
  }, [intentQuery.isError, queryClient]);

  const intent = intentQuery.data;
  const remaining = intent?.expiresAt
    ? new Date(intent.expiresAt).getTime() - now
    : 0;

  const checkPayment = async () => {
    setIsCheckingPayment(true);
    try {
      await intentQuery.refetch();
      await queryClient.invalidateQueries({ queryKey: ['rentals', id] });
    } finally {
      setIsCheckingPayment(false);
    }
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
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ alignItems: 'center', padding: 20, paddingBottom: 36 }}>
          <Text className="mt-2 text-lg font-bold text-text-primary">Thanh toán đơn thuê</Text>
          <Text className="mt-2 text-sm text-text-secondary">Số tiền cần thanh toán</Text>
          <Text className="mt-2 text-3xl font-extrabold text-primary">
            {currencyFormatter.format(intent.amountDue)}
          </Text>
          <View className="mt-5 w-full overflow-hidden rounded-3xl border border-border bg-white p-2">
            <Image
              source={require('../../../../assets/images/qr-vietqr-sepay.png')}
              style={{ width: '100%', aspectRatio: 540 / 660 }}
              contentFit="contain"
              accessibilityLabel="Mã QR SePay"
            />
          </View>
          <Text className="mt-4 text-center text-sm text-text-secondary">
            Thời gian còn lại: {now === 0 ? '--:--' : formatRemaining(remaining)}
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-14 w-full flex-row items-center justify-center rounded-xl bg-primary px-4"
            onPress={() => intent.paymentProvider === 'SEPAY' ? void checkPayment() : sandboxMutation.mutate()}
            disabled={sandboxMutation.isPending || isCheckingPayment}
          >
            {sandboxMutation.isPending || isCheckingPayment ? <ActivityIndicator color="white" /> : <RefreshCw size={18} color="white" />}
            <Text className="ml-2 text-center font-bold text-white">Kiểm tra thanh toán</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
