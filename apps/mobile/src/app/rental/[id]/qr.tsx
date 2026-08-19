import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../../services/api/client';
import { colors } from '../../../theme/colors';

type HandoverQr = {
  token: string;
  qrPayload: string;
  expiresAt: string;
};

export default function QrScreen() {
  const { id, handoverId } = useLocalSearchParams<{
    id: string;
    handoverId: string;
  }>();
  const router = useRouter();
  const qrQuery = useQuery({
    queryKey: ['handoverQr', id, handoverId],
    queryFn: async () =>
      (
        await apiClient.post<HandoverQr>(
          `/rentals/${id}/handover/${handoverId}/qr`,
        )
      ).data,
    enabled: Boolean(id && handoverId),
    staleTime: 0,
  });

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
          Mã QR bàn giao
        </Text>
        <View className="w-11" />
      </View>

      {qrQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : qrQuery.isError || !qrQuery.data ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center font-semibold text-danger">
            Không thể tạo mã bàn giao. Vui lòng quay lại và thử lại.
          </Text>
        </View>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-full items-center rounded-3xl border border-border bg-white p-8 shadow-sm">
            <Text className="mb-6 text-xs font-bold uppercase tracking-widest text-text-secondary">
              Mã xác nhận dùng một lần
            </Text>
            <QRCode
              value={qrQuery.data.qrPayload}
              size={240}
              quietZone={12}
              ecl="H"
              color="#16211D"
              backgroundColor="#FFFFFF"
            />
            <Text className="mt-6 font-mono text-sm font-bold tracking-wider text-text-primary" selectable>
              {qrQuery.data.token}
            </Text>
          </View>

          <Text className="mt-8 text-center text-2xl font-extrabold text-text-primary">
            Đưa mã này cho người thuê
          </Text>
          <Text className="mt-2 text-center leading-6 text-text-secondary">
            Người thuê mở bước bàn giao trong ứng dụng và quét mã để xác nhận đã nhận tài sản.
          </Text>
          <View className="mt-6 flex-row items-center rounded-xl border border-warning/20 bg-warning/10 p-4">
            <ShieldAlert size={20} color={colors.warning} />
            <Text className="ml-3 flex-1 text-sm font-medium text-warning">
              Không gửi mã qua mạng xã hội. Mã hết hạn sau thời gian ngắn và chỉ dùng một lần.
            </Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
