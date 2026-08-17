import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, CreditCard } from 'lucide-react-native';

export default function PaymentSandboxScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: processPayment, isPending } = useMutation({
    mutationFn: async () => {
      // Assuming Sandbox payment provider
      return apiClient.post(`/rentals/${id}/pay`, {
        provider: 'SANDBOX',
        amount: 0, // Should technically get this from the rental info, but backend sandbox might ignore or we can fetch first
      });
    },
    onSuccess: () => {
      Alert.alert('Thanh toán thành công', 'Thanh toán của bạn đã được xử lý trong chế độ Sandbox.');
      queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Thanh toán thất bại', error.response?.data?.message || 'Giao dịch không thành công');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Thanh toán Sandbox</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-10 items-center">
        <CreditCard size={64} color={colors.primary.DEFAULT} className="mb-6" />
        <Text className="text-2xl font-bold text-text-primary mb-2">Thanh toán thử nghiệm</Text>
        <Text className="text-text-secondary text-center mb-8 px-4">
          Đây là môi trường thử nghiệm (Sandbox). Bạn sẽ không bị trừ tiền thật. Nhấn nút bên dưới để giả lập một giao dịch thanh toán thành công.
        </Text>

        <TouchableOpacity 
          className={`w-full bg-primary py-4 rounded-xl items-center ${isPending ? 'opacity-70' : ''}`}
          onPress={() => processPayment()}
          disabled={isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Giả lập Thanh toán Thành công</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
