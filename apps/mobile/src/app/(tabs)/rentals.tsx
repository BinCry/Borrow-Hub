import { colors } from '../../theme/colors';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRentals } from '../../hooks/useRentals';
import { getRentalStatusPresentation } from '../../utils/status-mappers';
import { useState } from 'react';
import { Link } from 'expo-router';
import { CalendarClock, ArrowRight } from 'lucide-react-native';

export default function RentalsScreen() {
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter');

  const { data, isLoading, isError, refetch, isRefetching } = useRentals(activeTab);



  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10">
        <Text className="text-2xl font-bold text-text-primary mb-4">Đơn thuê</Text>
        
        {/* Segmented Control */}
        <View className="flex-row bg-gray-100 p-1 rounded-lg">
          <TouchableOpacity 
            className={`flex-1 py-2 items-center rounded-md ${activeTab === 'renter' ? 'bg-surface shadow-sm' : ''}`}
            onPress={() => setActiveTab('renter')}
          >
            <Text className={`font-semibold ${activeTab === 'renter' ? 'text-primary' : 'text-text-secondary'}`}>Đi thuê</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            className={`flex-1 py-2 items-center rounded-md ${activeTab === 'owner' ? 'bg-surface shadow-sm' : ''}`}
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
          renderItem={({ item }) => {
            const statusUi = getRentalStatusPresentation(item.status, activeTab === 'owner');
            return (
              <Link href={`/rental/${item.id}`} asChild>
                <TouchableOpacity className="bg-surface p-4 rounded-xl border border-border mb-3 flex-row items-center">
                  <View className="flex-1">
                    <Text className="text-lg font-bold text-text-primary mb-1">{item.asset?.title}</Text>
                    <Text className="text-text-secondary text-sm mb-3">
                      {activeTab === 'renter' ? `Owner: ${item.owner?.fullName}` : `Renter: ${item.renter?.fullName}`}
                    </Text>
                    <View className="flex-row">
                      <View 
                        className="px-2 py-1 rounded-md" 
                        style={{ backgroundColor: statusUi.colorHex }}
                      >
                        <Text className="text-xs font-bold text-white">
                          {statusUi.label}
                        </Text>
                      </View>
                    </View>
                  </View>
                  <ArrowRight size={20} color={colors.text.muted} />
                </TouchableOpacity>
              </Link>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
