import { colors } from '../../theme/colors';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { PaginatedResponse, RentalRequest } from '../../types/api';
import { useState } from 'react';
import { Link } from 'expo-router';
import { CalendarClock, ArrowRight } from 'lucide-react-native';

export default function RentalsScreen() {
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter');

  const { data, isLoading, isError, refetch, isRefetching } = useQuery({
    queryKey: ['rentals', activeTab],
    queryFn: async () => {
      const roleFilter = activeTab === 'renter' ? 'role=renter' : 'role=owner';
      const response = await apiClient.get<PaginatedResponse<RentalRequest>>(`/rentals/my?${roleFilter}`);
      return response.data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING_OWNER': return 'bg-warning text-white';
      case 'APPROVED':
      case 'AWAITING_PAYMENT':
      case 'AWAITING_SIGNATURE': return 'bg-primary text-white';
      case 'CONFIRMED':
      case 'READY_FOR_HANDOVER':
      case 'ONGOING': return 'bg-success text-white';
      case 'RETURN_PENDING': return 'bg-warning text-white';
      case 'COMPLETED': return 'bg-gray-500 text-white';
      case 'DECLINED':
      case 'CANCELLED':
      case 'DISPUTED': return 'bg-danger text-white';
      default: return 'bg-gray-300 text-gray-800';
    }
  };

  const formatStatus = (status: string) => {
    return status.replace(/_/g, ' ');
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10">
        <Text className="text-2xl font-bold text-text-primary mb-4">Đơn thuê</Text>
        
        {/* Segmented Control */}
        <View className="flex-row bg-gray-100 p-1 rounded-lg">
          <TouchableOpacity 
            className={`flex-1 py-2 items-center rounded-md ${activeTab === 'renter' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('renter')}
          >
            <Text className={`font-semibold ${activeTab === 'renter' ? 'text-primary' : 'text-text-secondary'}`}>Đi thuê</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 items-center rounded-md ${activeTab === 'owner' ? 'bg-white shadow-sm' : ''}`}
            onPress={() => setActiveTab('owner')}
          >
            <Text className={`font-semibold ${activeTab === 'owner' ? 'text-primary' : 'text-text-secondary'}`}>Cho thuê</Text>
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center">
          <Text className="text-danger">Không thể tải danh sách đơn thuê.</Text>
        </View>
      ) : (
        <FlatList
          data={data?.data || []}
          keyExtractor={(item) => item.id}
          contentContainerClassName="p-4"
          refreshing={isRefetching}
          onRefresh={refetch}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-20">
              <CalendarClock size={48} color="#D1D5DB" />
              <Text className="text-text-secondary mt-4 text-lg font-medium">Chưa có đơn thuê nào</Text>
            </View>
          }
          renderItem={({ item }) => (
            <Link href={`/rental/${item.id}`} asChild>
              <TouchableOpacity className="bg-surface p-4 rounded-xl border border-border mb-3 flex-row items-center">
                <View className="flex-1">
                  <Text className="text-lg font-bold text-text-primary mb-1">{item.asset?.title}</Text>
                  <Text className="text-text-secondary text-sm mb-3">
                    {activeTab === 'renter' ? `Owner: ${item.owner?.fullName}` : `Renter: ${item.renter?.fullName}`}
                  </Text>
                  <View className="flex-row">
                    <View className={`px-2 py-1 rounded-md ${getStatusColor(item.status).split(' ')[0]}`}>
                      <Text className={`text-xs font-bold ${getStatusColor(item.status).split(' ')[1]}`}>
                        {formatStatus(item.status)}
                      </Text>
                    </View>
                  </View>
                </View>
                <ArrowRight size={20} color="#9CA3AF" />
              </TouchableOpacity>
            </Link>
          )}
        />
      )}
    </SafeAreaView>
  );
}
