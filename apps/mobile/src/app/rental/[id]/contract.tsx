import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, FileText, CheckCircle, Shield } from 'lucide-react-native';
import { useState } from 'react';

export default function ContractScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);

  const { mutate: signContract, isPending } = useMutation({
    mutationFn: async () => {
      return apiClient.post(`/rentals/${id}/sign`, {
        signatureMethod: 'IN_APP',
      });
    },
    onSuccess: () => {
      Alert.alert('Ký hợp đồng thành công', 'Bạn đã ký hợp đồng thuê thành công.');
      queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Ký thất bại', error.response?.data?.message || 'Không thể ký hợp đồng');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Hợp đồng điện tử</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-5 py-6 bg-surfaceSecondary">
        <View className="items-center mb-8">
          <View className="w-16 h-16 bg-white rounded-full shadow-sm items-center justify-center mb-4 border border-border">
             <Shield size={32} color={colors.primary.DEFAULT} />
          </View>
          <Text className="text-2xl font-extrabold text-text-primary uppercase tracking-widest text-center">Hợp đồng điện tử</Text>
          <Text className="text-text-secondary mt-1 tracking-wider text-sm">THỎA THUẬN THUÊ TÀI SẢN</Text>
        </View>

        <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <Text className="text-lg font-bold text-text-primary mb-4 uppercase border-b border-gray-100 pb-2">Điều khoản và Điều kiện</Text>
          <Text className="text-text-primary text-[15px] leading-7 font-medium text-justify">
            Bằng việc ký hợp đồng điện tử này, hai bên đồng ý với các điều khoản sau:
            {'\n\n'}
            <Text className="font-bold">Điều 1:</Text> Người Thuê đồng ý sử dụng tài sản có trách nhiệm và hoàn trả đúng tình trạng như khi nhận.
            {'\n\n'}
            <Text className="font-bold">Điều 2:</Text> Chủ Sở Hữu cam kết tài sản trong tình trạng hoạt động tốt và đúng với mô tả.
            {'\n\n'}
            <Text className="font-bold">Điều 3:</Text> Mọi hư hỏng hoặc mất mát sẽ được giải quyết qua quy trình xử lý tranh chấp của nền tảng Borrow Hub.
            {'\n\n'}
            <Text className="font-bold">Điều 4:</Text> Quá trình giao nhận phải được hoàn tất thông qua mã QR hoặc xác nhận điện tử được mã hóa.
          </Text>
        </View>

        <TouchableOpacity 
          className="flex-row items-center mb-8"
          onPress={() => setAgreed(!agreed)}
        >
          <View className={`w-6 h-6 rounded-md border items-center justify-center mr-3 ${agreed ? 'bg-primary border-primary' : 'border-border'}`}>
            {agreed && <CheckCircle size={16} color="white" />}
          </View>
          <Text className="text-text-primary flex-1">Tôi đã đọc và đồng ý với các điều khoản và điều kiện của hợp đồng thuê này.</Text>
        </TouchableOpacity>
      </ScrollView>

      <View className="px-5 py-5 bg-surface border-t border-border shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <TouchableOpacity 
          className={`w-full py-4 rounded-xl items-center shadow-md flex-row justify-center ${agreed && !isPending ? 'bg-primary' : 'bg-gray-300'}`}
          onPress={() => signContract()}
          disabled={!agreed || isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <>
               <FileText size={20} color="white" className="mr-2" />
               <Text className="text-white font-bold text-lg">Xác nhận ký hợp đồng</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
