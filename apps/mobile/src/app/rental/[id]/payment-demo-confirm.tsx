import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { ActivityIndicator, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RentalsService } from '../../../services/rentals/rentals.service';
import { colors } from '../../../theme/colors';

export default function DemoPaymentConfirmationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirmMutation = useMutation({
    mutationFn: () => RentalsService.confirmDemoPayment(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      void queryClient.invalidateQueries({ queryKey: ['rentals', id] });
      router.replace(`/rental/${id}`);
    },
  });

  return (
    <SafeAreaView className="flex-1 items-center justify-center bg-background px-6">
      <ShieldAlert size={52} color={colors.warning} />
      <Text className="mt-5 text-center text-2xl font-extrabold text-text-primary">
        Xác nhận thanh toán?
      </Text>
      <Text className="mt-3 text-center leading-6 text-text-secondary">
        Xác nhận để chuyển đơn thuê sang bước ký hợp đồng.
      </Text>
      {confirmMutation.isError ? (
        <Text className="mt-4 text-center text-danger">
          Không thể xác nhận. Hãy đăng nhập bằng tài khoản tham gia đơn và kiểm tra đơn còn chờ thanh toán.
        </Text>
      ) : null}
      <TouchableOpacity
        accessibilityRole="button"
        className="mt-7 min-h-14 w-full flex-row items-center justify-center rounded-xl bg-primary"
        disabled={confirmMutation.isPending}
        onPress={() => confirmMutation.mutate()}
      >
        {confirmMutation.isPending ? <ActivityIndicator color="white" /> : <CheckCircle2 size={20} color="white" />}
        <Text className="ml-2 text-lg font-bold text-white">Xác nhận thanh toán</Text>
      </TouchableOpacity>
      <TouchableOpacity className="mt-4 p-3" onPress={() => router.back()}>
        <Text className="font-semibold text-text-secondary">Quay lại</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
