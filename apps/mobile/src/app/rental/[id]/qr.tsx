import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, QrCode, ShieldAlert } from 'lucide-react-native';

export default function QrScreen() {
  const { id, handoverId } = useLocalSearchParams<{ id: string, handoverId: string }>();
  const router = useRouter();

  // In a real app, generate QR Code from backend response
  const { data: qrData, isLoading } = useQuery({
    queryKey: ['handoverQr', id, handoverId],
    queryFn: async () => {
      const response = await apiClient.post(`/rentals/${id}/handover/${handoverId}/qr`);
      return response.data;
    },
    enabled: !!handoverId,
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Mã QR Giao nhận</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 items-center justify-center bg-background">
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        ) : (
          <View className="items-center px-6 w-full">
            <View className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.1)] w-full items-center justify-center mb-8 border border-gray-100">
              <Text className="text-sm font-bold text-text-secondary mb-6 tracking-widest uppercase">Mã xác nhận</Text>
              
              {/* Dummy QR Code visual */}
              <View className="w-56 h-56 bg-white items-center justify-center">
                <QrCode size={200} color="#1F2937" strokeWidth={1} />
              </View>
              
              <View className="bg-gray-100 px-4 py-2 rounded-lg mt-6">
                 <Text className="text-lg font-mono font-bold tracking-widest text-text-primary">{qrData?.token || 'A8X-92M'}</Text>
              </View>
            </View>
            
            <Text className="text-2xl font-extrabold text-text-primary mb-3 text-center tracking-tight">Quét để nhận tài sản</Text>
            <Text className="text-text-secondary text-center px-4 leading-6 mb-8 text-base">
              Vui lòng đưa mã này cho người thuê để họ quét bằng ứng dụng Borrow Hub.
            </Text>

            <View className="flex-row items-center bg-warning/10 p-4 rounded-xl border border-warning/20">
               <ShieldAlert size={20} color={colors.warning} />
               <Text className="flex-1 ml-3 text-sm text-warning font-medium">Tuyệt đối không chia sẻ mã này qua tin nhắn hoặc mạng xã hội.</Text>
            </View>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
