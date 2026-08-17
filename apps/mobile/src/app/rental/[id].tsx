import { colors } from '../../theme/colors';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { RentalRequest } from '../../types/api';
import { ChevronLeft, Info, MapPin } from 'lucide-react-native';
import { format } from 'date-fns';
import { useAuthStore } from '../../store/authStore';
import { useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Quick way to get current user ID since we don't have a robust user store yet
  useEffect(() => {
    apiClient.get('/auth/me').then(res => setCurrentUserId(res.data.id)).catch(() => {});
  }, []);

  const { data: rental, isLoading, refetch } = useQuery({
    queryKey: ['rental', id],
    queryFn: async () => {
      const response = await apiClient.get<RentalRequest>(`/rentals/${id}`);
      return response.data;
    },
  });

  const { mutate: handleAction, isPending: actionLoading } = useMutation({
    mutationFn: async ({ action, payload = {} }: { action: string, payload?: any }) => {
      if (action === 'approve') return apiClient.patch(`/rentals/${id}/approve`, payload);
      if (action === 'decline') return apiClient.patch(`/rentals/${id}/decline`, payload);
      if (action === 'cancel') return apiClient.post(`/rentals/${id}/cancel`, payload);
      throw new Error('Unknown action');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rental', id] });
      queryClient.invalidateQueries({ queryKey: ['rentals'] });
    },
    onError: (error: any) => {
      Alert.alert('Lỗi thao tác', error.response?.data?.message || 'Đã có lỗi xảy ra');
    }
  });

  if (isLoading || !rental || !currentUserId) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  const isOwner = rental.ownerId === currentUserId;
  const isRenter = rental.renterId === currentUserId;

  const renderActionButtons = () => {
    switch (rental.status) {
      case 'PENDING_OWNER':
        if (isOwner) {
          return (
            <View className="flex-row space-x-3 mt-4">
              <TouchableOpacity 
                className="flex-1 bg-surface border border-danger py-3 rounded-xl items-center"
                onPress={() => handleAction({ action: 'decline', payload: { reason: 'Không có sẵn' } })}
              >
                <Text className="text-danger font-semibold">Từ chối</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                className="flex-1 bg-primary py-3 rounded-xl items-center"
                onPress={() => handleAction({ action: 'approve' })}
              >
                <Text className="text-white font-semibold">Chấp nhận</Text>
              </TouchableOpacity>
            </View>
          );
        } else {
          return (
            <TouchableOpacity 
              className="w-full bg-surface border border-danger py-3 rounded-xl items-center mt-4"
              onPress={() => handleAction({ action: 'cancel', payload: { reason: 'Đổi ý' } })}
            >
              <Text className="text-danger font-semibold">Huỷ yêu cầu</Text>
            </TouchableOpacity>
          );
        }
      case 'APPROVED':
      case 'AWAITING_PAYMENT':
        if (isRenter) {
          return (
            <TouchableOpacity 
              className="w-full bg-primary py-4 rounded-xl items-center mt-4"
              onPress={() => router.push(`/rental/${id}/payment`)}
            >
              <Text className="text-white font-bold">Thanh toán ngay</Text>
            </TouchableOpacity>
          );
        }
        break;
      case 'AWAITING_SIGNATURE':
        return (
          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl items-center mt-4"
            onPress={() => router.push(`/rental/${id}/contract`)}
          >
            <Text className="text-white font-bold">Ký hợp đồng</Text>
          </TouchableOpacity>
        );
      case 'READY_FOR_HANDOVER':
      case 'CONFIRMED':
        return (
          <TouchableOpacity 
            className="w-full bg-primary py-4 rounded-xl items-center mt-4"
            onPress={() => router.push(`/rental/${id}/handover`)}
          >
            <Text className="text-white font-bold">Tiến hành giao nhận</Text>
          </TouchableOpacity>
        );
      case 'ONGOING':
        if (isRenter) {
           return (
            <TouchableOpacity 
              className="w-full bg-primary py-4 rounded-xl items-center mt-4"
              onPress={() => router.push(`/rental/${id}/return`)}
            >
              <Text className="text-white font-bold">Trả tài sản</Text>
            </TouchableOpacity>
          );
        }
        break;
    }
    return null;
  };

  const getStatusText = () => {
    if (rental.status === 'PENDING_OWNER') {
      return isOwner ? 'Cần xử lý: Yêu cầu đang chờ' : 'Đang chờ chủ sở hữu phê duyệt';
    }
    return rental.status.replace(/_/g, ' ');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Chi tiết đơn thuê</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-4 py-4">
        {/* Status Card */}
        <View className="bg-primary-soft p-4 rounded-xl border border-primary/20 mb-6 flex-row items-start">
          <Info size={20} color="#365B4E" className="mr-3 mt-0.5" />
          <View className="flex-1">
            <Text className="text-primary-dark font-bold text-lg mb-1">{getStatusText()}</Text>
            <Text className="text-primary-dark opacity-80 text-sm">
              Vui lòng hoàn thành các bước yêu cầu để tiếp tục quá trình thuê.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View className="mb-6">
          {renderActionButtons()}
        </View>

        {/* Asset Details */}
        <View className="bg-surface p-4 rounded-xl border border-border mb-4">
          <Text className="text-lg font-bold text-text-primary mb-2">Chi tiết tài sản</Text>
          <Text className="text-text-primary font-medium mb-1">{rental.asset?.title}</Text>
          <Text className="text-text-secondary text-sm mb-3">ID: {rental.asset?.id}</Text>
          
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary">Ngày bắt đầu</Text>
            <Text className="text-text-primary font-medium">{format(new Date(rental.startAt), 'MMM dd, yyyy HH:mm')}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-text-secondary">Ngày kết thúc</Text>
            <Text className="text-text-primary font-medium">{format(new Date(rental.endAt), 'MMM dd, yyyy HH:mm')}</Text>
          </View>
        </View>

        {/* Price Details */}
        <View className="bg-surface p-4 rounded-xl border border-border mb-4">
          <Text className="text-lg font-bold text-text-primary mb-3">Tóm tắt thanh toán</Text>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary">Phí thuê</Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.rentalFee)}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary">Phí dịch vụ</Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.serviceFee)}</Text>
          </View>
          <View className="flex-row justify-between pt-3 border-t border-border mt-1">
            <Text className="text-base font-bold text-text-primary">Tổng cộng</Text>
            <Text className="text-base font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.totalAmount)}</Text>
          </View>
        </View>

        {/* User Details */}
        <View className="bg-surface p-4 rounded-xl border border-border mb-8">
          <Text className="text-lg font-bold text-text-primary mb-3">
            {isOwner ? 'Thông tin người thuê' : 'Thông tin chủ sở hữu'}
          </Text>
          <Text className="text-text-primary font-medium mb-1">
            {isOwner ? rental.renter?.fullName : rental.owner?.fullName}
          </Text>
          <Text className="text-text-secondary text-sm">
            Thông tin liên hệ sẽ hiển thị sau khi thanh toán và ký hợp đồng.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
