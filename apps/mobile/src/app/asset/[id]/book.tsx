import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { Asset } from '../../types/api';
import { useState } from 'react';
import { ChevronLeft, Calendar as CalendarIcon, Info } from 'lucide-react-native';
import { addDays, differenceInDays, format } from 'date-fns';

export default function BookAssetScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  // Very simplified date selection for MVP: just select start and end
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addDays(new Date(), 3));

  const daysCount = Math.max(1, differenceInDays(endDate, startDate) + 1);

  const { data: asset, isLoading } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await apiClient.get<Asset>(`/assets/${id}`);
      return response.data;
    },
  });

  const { mutate: createRental, isPending: isBooking } = useMutation({
    mutationFn: async () => {
      const payload = {
        assetId: id,
        startAt: startDate.toISOString(),
        endAt: endDate.toISOString(),
        deliveryMethod: 'PICKUP', // hardcode or add selection
      };
      return apiClient.post('/rentals', payload);
    },
    onSuccess: (res) => {
      Alert.alert('Request Sent', 'Your rental request has been sent to the owner.');
      router.replace(`/(tabs)/rentals`);
    },
    onError: (error: any) => {
      Alert.alert('Booking Failed', error.response?.data?.message || 'Could not send request');
    }
  });

  if (isLoading || !asset) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#4F7C6B" />
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
        <Text className="text-lg font-bold text-text-primary">Request Rental</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        {/* Asset Summary */}
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <Text className="text-lg font-bold text-text-primary mb-1">{asset.title}</Text>
          <Text className="text-text-secondary text-sm">Owner: {asset.owner?.fullName}</Text>
        </View>

        {/* Date Selection */}
        <Text className="text-lg font-bold text-text-primary mb-3">Rental Period</Text>
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-1">
              <Text className="text-text-secondary text-xs mb-1">Start Date</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color="#4F7C6B" className="mr-2" />
                <Text className="text-text-primary font-medium">{format(startDate, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
            <View className="flex-1 border-l border-border pl-4">
              <Text className="text-text-secondary text-xs mb-1">End Date</Text>
              <View className="flex-row items-center">
                <CalendarIcon size={16} color="#4F7C6B" className="mr-2" />
                <Text className="text-text-primary font-medium">{format(endDate, 'MMM dd, yyyy')}</Text>
              </View>
            </View>
          </View>
          
          <View className="bg-primary-soft p-3 rounded-lg flex-row items-start">
            <Info size={16} color="#365B4E" className="mr-2 mt-0.5" />
            <Text className="text-primary-dark text-sm flex-1 leading-5">
              The owner needs to approve your request before you can pay and sign the contract.
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <Text className="text-lg font-bold text-text-primary mb-3">Price Breakdown</Text>
        <View className="bg-surface p-4 rounded-xl border border-border mb-6">
          <View className="flex-row justify-between mb-3">
            <Text className="text-text-secondary">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)} x {daysCount} days
            </Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(subtotal)}</Text>
          </View>
          <View className="flex-row justify-between mb-4 pb-4 border-b border-border">
            <Text className="text-text-secondary">Service Fee</Text>
            <Text className="text-text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(serviceFee)}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-lg font-bold text-text-primary">Total</Text>
            <Text className="text-lg font-bold text-primary">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(total)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 py-4 bg-surface border-t border-border">
        <TouchableOpacity 
          className={`bg-primary rounded-xl py-4 items-center shadow-sm ${isBooking ? 'opacity-70' : ''}`}
          onPress={() => createRental()}
          disabled={isBooking}
        >
          <Text className="text-white font-bold text-lg">{isBooking ? 'Sending Request...' : 'Send Request'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
