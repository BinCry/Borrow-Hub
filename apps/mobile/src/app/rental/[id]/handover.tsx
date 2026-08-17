import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, QrCode, ClipboardCheck, ShieldCheck } from 'lucide-react-native';

export default function HandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { mutate: startHandover, isPending: isStarting } = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/rentals/${id}/handover`, {
        type: 'DELIVERY',
      });
    },
    onSuccess: (res) => {
      const handoverId = res.data.id;
      // Option to show QR code 
      router.push(`/rental/${id}/qr?handoverId=${handoverId}`);
    },
    onError: (error: any) => {
      Alert.alert('Thất bại', error.response?.data?.message || 'Không thể bắt đầu quá trình giao nhận');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Quy trình giao nhận</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-8">
        <View className="items-center mb-8">
           <View className="w-20 h-20 bg-primary-soft rounded-full items-center justify-center mb-4">
             <ShieldCheck size={40} color={colors.primary.DEFAULT} />
           </View>
           <Text className="text-2xl font-extrabold text-text-primary mb-2 tracking-tight text-center">Bàn giao an toàn</Text>
           <Text className="text-text-secondary text-center leading-5">
             Bảo vệ cả người thuê và người cho thuê bằng quy trình xác nhận điện tử được mã hóa.
           </Text>
        </View>

        <TouchableOpacity 
          className="bg-surface p-5 rounded-2xl border border-primary/20 mb-4 flex-row items-center shadow-sm"
          onPress={() => startHandover()}
          disabled={isStarting}
        >
          <View className="bg-primary-soft p-3 rounded-full mr-4">
            <QrCode size={24} color={colors.primary.DEFAULT} />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary">Tạo mã QR</Text>
            <Text className="text-text-secondary text-sm">Chủ sở hữu tạo mã QR, Người thuê quét để xác nhận</Text>
          </View>
        </TouchableOpacity>
        
        {/* Simplified manual confirmation for MVP if needed */}
        <TouchableOpacity 
          className="bg-surface p-5 rounded-2xl border border-border flex-row items-center"
          onPress={() => Alert.alert('Giao nhận thủ công', 'Vui lòng sử dụng mã QR để giao nhận an toàn hơn.')}
        >
          <View className="bg-gray-100 p-3 rounded-full mr-4">
            <ClipboardCheck size={24} color="#6B7280" />
          </View>
          <View className="flex-1">
            <Text className="text-lg font-bold text-text-primary text-gray-500">Xác nhận thủ công</Text>
            <Text className="text-text-secondary text-sm text-gray-400">Tạm thời vô hiệu hóa vì lý do bảo mật</Text>
          </View>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
