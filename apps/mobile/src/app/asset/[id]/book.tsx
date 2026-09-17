import { colors } from '../../../theme/colors';
import { isAxiosError } from 'axios';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAsset } from '@/hooks/useAssets';
import { useCreateRental } from '@/hooks/useRentals';
import { useState } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Info } from 'lucide-react-native';
import { addDays, differenceInDays, format } from 'date-fns';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useAuthStore } from '../../../store/authStore';

type ApiErrorBody = {
  error?: {
    message?: string | string[];
  };
  message?: string | string[];
};

type BookingErrorAction = 'login' | 'kyc';

type BookingErrorInfo = {
  title: string;
  message: string;
  action?: BookingErrorAction;
};

function readApiMessage(error: unknown) {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return undefined;
  }

  const message = error.response?.data?.error?.message ?? error.response?.data?.message;

  if (Array.isArray(message)) {
    return message.join('\n');
  }

  return typeof message === 'string' && message.trim().length > 0
    ? message
    : undefined;
}

function getBookingErrorInfo(error: unknown): BookingErrorInfo {
  if (!isAxiosError<ApiErrorBody>(error)) {
    return {
      title: 'Không thể kết nối',
      message: 'Kiểm tra kết nối mạng và thử lại.',
    };
  }

  const status = error.response?.status;
  const apiMessage = readApiMessage(error);

  if (status === 401) {
    return {
      title: 'Cần đăng nhập lại',
      message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại trước khi gửi yêu cầu thuê.',
      action: 'login',
    };
  }

  if (apiMessage === 'Only verified users can create rental requests') {
    return {
      title: 'Cần xác thực danh tính',
      message: 'Bạn cần hoàn tất KYC trước khi gửi yêu cầu thuê.',
      action: 'kyc',
    };
  }

  if (apiMessage === 'You cannot rent your own asset') {
    return {
      title: 'Không thể thuê bài của mình',
      message: 'Bạn không thể gửi yêu cầu thuê tài sản do chính mình đăng.',
    };
  }

  if (apiMessage === 'Asset is not available for rental') {
    return {
      title: 'Tài sản không khả dụng',
      message: 'Tài sản này đã bị gỡ, tạm khóa hoặc chưa được duyệt để cho thuê.',
    };
  }

  if (
    apiMessage === 'Invalid rental time range' ||
    apiMessage === 'Start time must be before end time'
  ) {
    return {
      title: 'Ngày thuê chưa hợp lệ',
      message: 'Hãy chọn ngày bắt đầu trước ngày kết thúc.',
    };
  }

  if (apiMessage === 'Rental duration is outside the allowed range for this asset') {
    return {
      title: 'Số ngày thuê không hợp lệ',
      message: 'Thời lượng thuê đang nằm ngoài giới hạn tối thiểu/tối đa của tài sản này.',
    };
  }

  if (apiMessage === 'This asset already has an overlapping booking') {
    return {
      title: 'Trùng lịch thuê',
      message: 'Tài sản này đã có đơn thuê trong khoảng thời gian bạn chọn. Hãy chọn ngày khác.',
    };
  }

  if (apiMessage?.toLowerCase().includes('availability')) {
    return {
      title: 'Ngoài lịch cho thuê',
      message: 'Thời gian bạn chọn nằm ngoài lịch cho thuê của tài sản. Hãy chọn ngày khác.',
    };
  }

  if (status === 403) {
    return {
      title: 'Không đủ điều kiện',
      message: apiMessage ?? 'Tài khoản của bạn chưa đủ điều kiện để gửi yêu cầu thuê.',
    };
  }

  if (status === 404) {
    return {
      title: 'Không tìm thấy tài sản',
      message: apiMessage ?? 'Tài sản có thể đã bị xóa hoặc không còn được cho thuê.',
    };
  }

  if (status === 409) {
    return {
      title: 'Yêu cầu bị xung đột',
      message: apiMessage ?? 'Thông tin thuê đang xung đột với trạng thái hiện tại của tài sản.',
    };
  }

  return {
    title: 'Đặt thuê thất bại',
    message: apiMessage ?? 'Kiểm tra thông tin và thử lại.',
  };
}

export default function BookAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { isAuthenticated, isLoading: isCheckingAuth } = useAuthStore();

  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 3));

  const daysCount = Math.max(1, differenceInDays(endDate, startDate));

  const { data: asset, isLoading, isError, refetch } = useAsset(id);

  const { mutate: createRental, isPending: isBooking } = useCreateRental();

  const moveStartDate = (days: number) => {
    const nextStart = addDays(startDate, days);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (nextStart < today) return;
    setStartDate(nextStart);
    setEndDate(addDays(endDate, days));
  };

  const changeDuration = (days: number) => {
    const minimum = asset?.minimumDurationDays ?? 1;
    const maximum = asset?.maximumDurationDays ?? 30;
    const nextDuration = Math.min(maximum, Math.max(minimum, daysCount + days));
    setEndDate(addDays(startDate, nextDuration));
  };

  const handleBooking = () => {
    if (isCheckingAuth) {
      Alert.alert('Đang kiểm tra đăng nhập', 'Vui lòng thử lại sau vài giây.');
      return;
    }

    if (!isAuthenticated) {
      Alert.alert(
        'Cần đăng nhập',
        'Bạn cần đăng nhập trước khi gửi yêu cầu thuê.',
        [
          { text: 'Để sau', style: 'cancel' },
          { text: 'Đăng nhập', onPress: () => router.push('/auth/login') },
        ],
      );
      return;
    }

    createRental(
      {
        assetId: id,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        deliveryMethod: 'PICKUP',
      },
      {
        onSuccess: () => {
          Alert.alert('Yêu cầu đã được gửi', 'Yêu cầu thuê của bạn đã được gửi cho chủ sở hữu.');
          router.replace(`/(tabs)/rentals`);
        },
        onError: (error) => {
          const errorInfo = getBookingErrorInfo(error);

          if (errorInfo.action === 'login') {
            Alert.alert(errorInfo.title, errorInfo.message, [
              { text: 'Để sau', style: 'cancel' },
              { text: 'Đăng nhập', onPress: () => router.push('/auth/login') },
            ]);
            return;
          }

          if (errorInfo.action === 'kyc') {
            Alert.alert(errorInfo.title, errorInfo.message, [
              { text: 'Để sau', style: 'cancel' },
              { text: 'Đi xác thực', onPress: () => router.push('/profile/kyc') },
            ]);
            return;
          }

          Alert.alert(errorInfo.title, errorInfo.message);
        }
      }
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  if (isError || !asset) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
            <ChevronLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary">Yêu cầu thuê</Text>
          <View className="w-10" />
        </View>
        <EmptyState
          title="Không thể tải tài sản"
          description="Tài sản có thể đã bị gỡ hoặc kết nối mạng đang gián đoạn."
          buttonText="Thử lại"
          onPress={() => void refetch()}
        />
      </SafeAreaView>
    );
  }

  const subtotal = asset.pricePerDay * daysCount;
  const serviceFee = Math.round(subtotal * 0.05); // Assume 5% service fee for UI breakdown
  const total = subtotal + serviceFee;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Yêu cầu thuê</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        {/* Asset Summary */}
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <Text className="text-lg font-bold text-text-primary mb-1">{asset.title}</Text>
          <Text className="text-text-secondary text-sm">Chủ sở hữu: {asset.owner?.fullName}</Text>
        </View>

        {/* Date Selection */}
        <Text className="text-lg font-bold text-text-primary mb-3">Thời gian thuê</Text>
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-text-secondary text-xs mb-1">Ngày bắt đầu</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color={colors.primary.DEFAULT} className="mr-2" />
                <Text className="text-text-primary font-medium">{format(startDate, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
            <View className="flex-1 border-l border-border pl-4">
              <Text className="text-text-secondary text-xs mb-1">Ngày kết thúc</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color={colors.primary.DEFAULT} className="mr-2" />
                <Text className="text-text-primary font-medium">{format(endDate, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
          </View>

          <View className="mb-4 flex-row gap-3">
            <View className="flex-1 flex-row items-center justify-between rounded-xl bg-surfaceSecondary p-2">
              <TouchableOpacity
                accessibilityLabel="Lùi ngày bắt đầu"
                className="h-11 w-11 items-center justify-center rounded-lg bg-surface"
                onPress={() => moveStartDate(-1)}
              >
                <Text className="text-xl font-bold text-primary">−</Text>
              </TouchableOpacity>
              <Text className="text-xs font-semibold text-text-secondary">Bắt đầu</Text>
              <TouchableOpacity
                accessibilityLabel="Tiến ngày bắt đầu"
                className="h-11 w-11 items-center justify-center rounded-lg bg-surface"
                onPress={() => moveStartDate(1)}
              >
                <Text className="text-xl font-bold text-primary">+</Text>
              </TouchableOpacity>
            </View>
            <View className="flex-1 flex-row items-center justify-between rounded-xl bg-surfaceSecondary p-2">
              <TouchableOpacity
                accessibilityLabel="Giảm số ngày thuê"
                className="h-11 w-11 items-center justify-center rounded-lg bg-surface"
                onPress={() => changeDuration(-1)}
              >
                <Text className="text-xl font-bold text-primary">−</Text>
              </TouchableOpacity>
              <Text className="text-xs font-semibold text-text-secondary">{daysCount} ngày</Text>
              <TouchableOpacity
                accessibilityLabel="Tăng số ngày thuê"
                className="h-11 w-11 items-center justify-center rounded-lg bg-surface"
                onPress={() => changeDuration(1)}
              >
                <Text className="text-xl font-bold text-primary">+</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          <View className="bg-primary-soft p-3 rounded-lg flex-row items-start">
            <Info size={16} color="#365B4E" className="mr-2 mt-0.5" />
            <Text className="text-primary-dark text-sm flex-1 leading-5">
              Chủ sở hữu cần chấp nhận yêu cầu của bạn trước khi bạn có thể thanh toán và ký hợp đồng.
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <Text className="text-lg font-bold text-text-primary mb-3">Chi tiết giá</Text>
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <View className="flex-row justify-between mb-3">
            <Text className="text-text-secondary">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)} x {daysCount} ngày
            </Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between mb-4 pb-4 border-b border-border">
            <Text className="text-text-secondary">Phí dịch vụ</Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(serviceFee)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-text-primary">Tổng cộng</Text>
            <Text className="text-lg font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 py-4 bg-surface border-t border-border">
        <TouchableOpacity 
          className={`bg-primary rounded-xl py-4 items-center shadow-sm ${isBooking || isCheckingAuth ? 'opacity-70' : ''}`}
          onPress={handleBooking}
          disabled={isBooking || isCheckingAuth}
        >
          <Text className="text-white font-bold text-lg">{isBooking ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
