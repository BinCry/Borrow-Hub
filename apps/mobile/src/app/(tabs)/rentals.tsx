import { isAxiosError } from 'axios';
import { useRouter } from 'expo-router';
import { ArrowRight, CalendarClock, LogIn, WifiOff } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRentals } from '../../hooks/useRentals';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';
import { getRentalStatusPresentation } from '../../utils/status-mappers';

export default function RentalsScreen() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const logout = useAuthStore((state) => state.logout);
  const [activeTab, setActiveTab] = useState<'renter' | 'owner'>('renter');

  const { data, error, isLoading, isError, refetch, isRefetching } = useRentals(
    activeTab,
    isAuthenticated,
  );
  const isUnauthorized = isAxiosError(error) && error.response?.status === 401;
  const goToLogin = () => {
    void logout().finally(() => router.push('/auth/login'));
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10">
        <Text className="text-2xl font-bold text-text-primary mb-4">Đơn thuê</Text>

        <View className="flex-row bg-gray-100 p-1 rounded-lg">
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-md ${
              activeTab === 'renter' ? 'bg-surface shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('renter')}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'renter' ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              Đi thuê
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            className={`flex-1 py-2 items-center rounded-md ${
              activeTab === 'owner' ? 'bg-surface shadow-sm' : ''
            }`}
            onPress={() => setActiveTab('owner')}
          >
            <Text
              className={`font-semibold ${
                activeTab === 'owner' ? 'text-primary' : 'text-text-secondary'
              }`}
            >
              Cho thuê
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {!isAuthenticated ? (
        <View className="flex-1 items-center justify-center px-6">
          <LogIn size={48} color={colors.text.muted} />
          <Text className="mt-4 text-center font-semibold text-text-primary">
            Đăng nhập để xem đơn thuê
          </Text>
          <Text className="mt-2 text-center text-text-secondary">
            Đơn đi thuê và cho thuê của bạn sẽ hiển thị sau khi đăng nhập.
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-12 w-full items-center justify-center rounded-xl bg-primary"
            onPress={goToLogin}
          >
            <Text className="font-bold text-white">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : isError ? (
        <View className="flex-1 items-center justify-center px-6">
          <WifiOff size={48} color={colors.text.muted} />
          <Text className="mt-4 text-center font-semibold text-text-primary">
            {isUnauthorized ? 'Phiên đăng nhập đã hết hạn' : 'Không thể tải danh sách đơn thuê'}
          </Text>
          <Text className="mt-2 text-center text-text-secondary">
            {isUnauthorized
              ? 'Bạn đăng nhập lại một lần là xem được đơn thuê.'
              : 'Kiểm tra mạng rồi thử tải lại sau vài giây.'}
          </Text>
          <TouchableOpacity
            className="mt-6 min-h-12 rounded-xl bg-primary px-6 items-center justify-center"
            onPress={isUnauthorized ? goToLogin : () => void refetch()}
          >
            <Text className="font-bold text-white">
              {isUnauthorized ? 'Đăng nhập lại' : 'Thử lại'}
            </Text>
          </TouchableOpacity>
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
              <Text className="text-text-secondary mt-4 text-lg font-medium">
                Chưa có đơn thuê nào
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusUi = getRentalStatusPresentation(item.status, activeTab === 'owner');
            return (
              <TouchableOpacity
                className="bg-surface p-4 rounded-xl border border-border mb-3 flex-row items-center"
                onPress={() => router.push(`/rental/${item.id}`)}
              >
                <View className="flex-1">
                  <Text className="text-lg font-bold text-text-primary mb-1">
                    {item.asset?.title}
                  </Text>
                  <Text className="text-text-secondary text-sm mb-3">
                    {activeTab === 'renter'
                      ? `Owner: ${item.owner?.fullName}`
                      : `Renter: ${item.renter?.fullName}`}
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
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
