import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ChevronLeft, QrCode, ShieldCheck } from 'lucide-react-native';
import { useState } from 'react';
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../../../services/api/client';
import { useRental } from '../../../hooks/useRentals';
import { colors } from '../../../theme/colors';
import { User } from '../../../types/domain';

function extractHandoverToken(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.searchParams.get('token') ?? value;
  } catch {
    return value.trim();
  }
}

export default function HandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);
  const rentalQuery = useRental(id);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const isOwner = rentalQuery.data?.ownerId === meQuery.data?.id;
  const isReturn = rentalQuery.data?.status === 'RETURN_PENDING';
  const startMutation = useMutation({
    mutationFn: async () =>
      (await apiClient.post<{ id: string }>(`/rentals/${id}/handover`, {
        type: isReturn ? 'RETURN' : 'DELIVERY',
      }))
        .data,
    onSuccess: (handover) => {
      router.push(`/rental/${id}/qr?handoverId=${handover.id}`);
    },
    onError: () => {
      Alert.alert(
        isReturn ? 'Không thể bắt đầu hoàn trả' : 'Không thể bắt đầu bàn giao',
        'Vui lòng kiểm tra trạng thái đơn thuê.',
      );
    },
  });
  const confirmMutation = useMutation({
    mutationFn: (token: string) =>
      apiClient.post('/rentals/handover/qr/confirm', { token }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['rentals'] });
      Alert.alert(
        isReturn ? 'Hoàn trả thành công' : 'Bàn giao thành công',
        isReturn
          ? 'Tài sản đã được hai bên xác nhận hoàn trả.'
          : 'Đơn thuê đã chuyển sang trạng thái đang thuê.',
      );
      router.back();
    },
    onError: () => {
      setHasScanned(false);
      Alert.alert('Mã không hợp lệ', 'Mã có thể đã hết hạn hoặc đã được sử dụng.');
    },
  });

  const isLoading = rentalQuery.isLoading || meQuery.isLoading;

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
          {isReturn ? 'Xác nhận hoàn trả' : 'Bàn giao tài sản'}
        </Text>
        <View className="w-11" />
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : isOwner ? (
        <View className="flex-1 items-center justify-center px-6">
          <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
            <ShieldCheck size={40} color={colors.primary.DEFAULT} />
          </View>
          <Text className="mt-5 text-center text-2xl font-extrabold text-text-primary">
            {isReturn ? 'Tạo phiên nhận lại an toàn' : 'Tạo phiên bàn giao an toàn'}
          </Text>
          <Text className="mt-2 text-center leading-6 text-text-secondary">
            Mã QR chỉ có hiệu lực trong thời gian ngắn và được khóa ngay sau lần xác nhận đầu tiên.
          </Text>
          <TouchableOpacity
            className={`mt-8 min-h-14 w-full flex-row items-center justify-center rounded-xl bg-primary ${
              startMutation.isPending ? 'opacity-70' : ''
            }`}
            disabled={startMutation.isPending}
            onPress={() => startMutation.mutate()}
          >
            {startMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <QrCode size={22} color="white" />
                <Text className="ml-2 text-lg font-bold text-white">
                  {isReturn ? 'Tạo mã QR nhận lại' : 'Tạo mã QR bàn giao'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : !permission?.granted ? (
        <View className="flex-1 items-center justify-center px-6">
          <QrCode size={64} color={colors.primary.DEFAULT} />
          <Text className="mt-5 text-center text-xl font-bold text-text-primary">
            Cần quyền truy cập camera
          </Text>
          <Text className="mt-2 text-center leading-6 text-text-secondary">
            Camera chỉ được dùng để đọc mã QR xác nhận do chủ tài sản tạo.
          </Text>
          <TouchableOpacity
            className="mt-7 min-h-14 w-full items-center justify-center rounded-xl bg-primary"
            onPress={() => void requestPermission()}
          >
            <Text className="text-lg font-bold text-white">Cho phép dùng camera</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View className="flex-1 bg-black">
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
            onBarcodeScanned={
              hasScanned
                ? undefined
                : ({ data }) => {
                    setHasScanned(true);
                    confirmMutation.mutate(extractHandoverToken(data));
                  }
            }
          />
          <View className="absolute inset-x-6 bottom-8 rounded-2xl bg-black/70 p-5">
            <Text className="text-center text-lg font-bold text-white">
              {isReturn
                ? 'Quét mã nhận lại trên thiết bị của chủ tài sản'
                : 'Quét mã trên thiết bị của chủ tài sản'}
            </Text>
            <Text className="mt-1 text-center text-white/80">
              Giữ mã QR nằm trọn trong khung camera.
            </Text>
            {confirmMutation.isPending ? (
              <ActivityIndicator className="mt-4" color="white" />
            ) : null}
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
