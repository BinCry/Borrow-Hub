import { colors } from '../../theme/colors';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useRental, useApproveRental, useCancelRental, useDeclineRental } from '../../hooks/useRentals';
import { ChevronLeft, CheckCircle2, Circle, Clock } from 'lucide-react-native';
import { format } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { User } from '../../types/domain';

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });

  const { data: rental, isLoading } = useRental(id);
  
  const { mutate: approveRental } = useApproveRental();
  const { mutate: declineRental } = useDeclineRental();
  const { mutate: cancelRental } = useCancelRental();

  const handleAction = ({ action, payload = {} }: { action: string, payload?: any }) => {
    if (action === 'approve') approveRental({ id });
    if (action === 'decline') declineRental({ id, reason: payload.reason || '' });
    if (action === 'cancel') cancelRental({ id, reason: payload.reason || '' });
  };

  if (isLoading || !rental || !currentUser) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  const isOwner = rental.ownerId === currentUser.id;
  const isRenter = rental.renterId === currentUser.id;

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
      case 'RETURN_PENDING':
        return (
          <TouchableOpacity
            className="mt-4 w-full items-center rounded-xl bg-primary py-4"
            onPress={() => router.push(`/rental/${id}/handover`)}
          >
            <Text className="font-bold text-white">
              {isOwner ? 'Tạo mã xác nhận nhận lại' : 'Quét mã xác nhận hoàn trả'}
            </Text>
          </TouchableOpacity>
        );
    }
    return null;
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
        {/* Status Timeline */}
        <View className="bg-surface p-5 rounded-2xl border border-border mb-6 shadow-sm">
          <Text className="font-extrabold text-lg text-text-primary mb-4">Tiến trình thuê</Text>
          <View className="pl-2">
            {[
              { label: 'Yêu cầu thuê', done: true, active: rental.status === 'PENDING_OWNER' },
              { label: 'Xác nhận', done: rental.status !== 'PENDING_OWNER' && rental.status !== 'CANCELLED', active: rental.status === 'AWAITING_PAYMENT' },
              { label: 'Thanh toán', done: !['PENDING_OWNER', 'AWAITING_PAYMENT', 'CANCELLED'].includes(rental.status), active: rental.status === 'AWAITING_PAYMENT' },
              { label: 'Ký hợp đồng', done: !['PENDING_OWNER', 'AWAITING_PAYMENT', 'AWAITING_SIGNATURE', 'CANCELLED'].includes(rental.status), active: rental.status === 'AWAITING_SIGNATURE' },
              { label: 'Bàn giao', done: ['ONGOING', 'COMPLETED'].includes(rental.status), active: rental.status === 'READY_FOR_HANDOVER' },
              { label: 'Hoàn trả', done: rental.status === 'COMPLETED', active: rental.status === 'ONGOING' }
            ].map((step, index, arr) => (
              <View key={index} className="flex-row items-start mb-4 relative">
                {/* Connector Line */}
                {index < arr.length - 1 && (
                  <View 
                    className={`absolute left-[9px] top-6 bottom-[-24px] w-0.5 z-0 ${step.done ? 'bg-primary' : 'bg-gray-200'}`} 
                  />
                )}
                {/* Node */}
                <View className="z-10 mr-4 bg-surface">
                  {step.done ? (
                    <CheckCircle2 size={20} color={colors.primary.DEFAULT} />
                  ) : step.active ? (
                    <Clock size={20} color={colors.warning} />
                  ) : (
                    <Circle size={20} color="#E5E7EB" />
                  )}
                </View>
                {/* Text */}
                <Text className={`text-base mt-[-2px] ${step.done ? 'font-medium text-text-primary' : step.active ? 'font-bold text-warning' : 'text-text-muted'}`}>
                  {step.label}
                </Text>
              </View>
            ))}
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
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.pricing.rentalFee)}</Text>
          </View>
          <View className="flex-row justify-between mb-2">
            <Text className="text-text-secondary">Phí dịch vụ</Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.pricing.serviceFee)}</Text>
          </View>
          <View className="flex-row justify-between pt-3 border-t border-border mt-1">
            <Text className="text-base font-bold text-text-primary">Tổng cộng</Text>
            <Text className="text-base font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(rental.pricing.totalAmount)}</Text>
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
