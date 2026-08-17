import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, ArrowLeftRight } from 'lucide-react-native';

export default function ReturnAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: requestReturn, isPending } = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/rentals/${id}/return-request`);
    },
    onSuccess: () => {
      Alert.alert('Đã gửi yêu cầu', 'Bạn đã yêu cầu trả tài sản. Chủ sở hữu sẽ xác nhận.');
      queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Thất bại', error.response?.data?.message || 'Không thể gửi yêu cầu trả');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Trả tài sản</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-10 items-center">
        <ArrowLeftRight size={64} color={colors.primary.DEFAULT} className="mb-6" />
        <Text className="text-2xl font-bold text-text-primary mb-2 text-center">Sẵn sàng trả tài sản?</Text>
        <Text className="text-text-secondary text-center mb-8 px-4 leading-5">
          Bằng việc bắt đầu quy trình trả, bạn thông báo cho chủ sở hữu rằng bạn đã sẵn sàng bàn giao lại tài sản. Đảm bảo tài sản đang ở tình trạng ban đầu để tránh tranh chấp.
        </Text>

        <TouchableOpacity 
          className={`w-full bg-primary py-4 rounded-xl items-center ${isPending ? 'opacity-70' : ''}`}
          onPress={() => requestReturn()}
          disabled={isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Yêu cầu trả tài sản</Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
