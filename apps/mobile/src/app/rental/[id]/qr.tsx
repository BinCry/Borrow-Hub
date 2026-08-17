import { colors } from '../../../theme/colors';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/services/api/client';
import { ChevronLeft, QrCode } from 'lucide-react-native';

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
        <Text className="text-lg font-bold text-text-primary">Handover QR</Text>
        <View className="w-10" />
      </View>

      <View className="flex-1 px-5 py-10 items-center justify-center">
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        ) : (
          <View className="items-center">
            <View className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6 items-center justify-center">
              {/* Dummy QR Code visual since we can't easily install react-native-qrcode-svg right now without adding deps */}
              <View className="w-48 h-48 bg-gray-200 items-center justify-center">
                <QrCode size={100} color="#1F2937" />
                <Text className="text-xs text-text-secondary mt-2 text-center">Token: {qrData?.token || 'xxxx'}</Text>
              </View>
            </View>
            <Text className="text-xl font-bold text-text-primary mb-2 text-center">Ask Renter to Scan</Text>
            <Text className="text-text-secondary text-center px-4">
              The Renter needs to scan this QR code using their Borrow Hub app to confirm the handover.
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
