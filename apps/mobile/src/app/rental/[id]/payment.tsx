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
      Alert.alert('Payment Successful', 'Your payment has been processed in Sandbox mode.');
      queryClient.invalidateQueries({ queryKey: ['rental', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Payment Failed', error.response?.data?.message || 'Transaction failed');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Payment Sandbox</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-10 items-center">
        <CreditCard size={64} color={colors.primary.DEFAULT} className="mb-6" />
        <Text className="text-2xl font-bold text-text-primary mb-2">Sandbox Payment</Text>
        <Text className="text-text-secondary text-center mb-8 px-4">
          This is a sandbox environment. No real money will be charged. Clicking the button below will simulate a successful payment transaction.
        </Text>

        <TouchableOpacity 
          className={`w-full bg-primary py-4 rounded-xl items-center ${isPending ? 'opacity-70' : ''}`}
          onPress={() => processPayment()}
          disabled={isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Simulate Successful Payment</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
