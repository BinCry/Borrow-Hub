import { colors } from '../../theme/colors';
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { LogOut, User, Settings, ShieldCheck, List, PlusCircle, HelpCircle } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { User as UserType } from '../../types/api';

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await apiClient.get<UserType>('/auth/me');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const handleLogout = () => {
    logout();
    router.replace('/auth/login');
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center p-4">
        <User size={64} color="#9CA3AF" />
        <Text className="text-xl font-bold text-text-primary mb-2">Chưa đăng nhập</Text>
        <Text className="text-text-secondary text-center mb-8">
          Đăng nhập để quản lý tài sản, đơn thuê và tin nhắn của bạn
        </Text>
        <TouchableOpacity 
          className="bg-primary w-full py-4 rounded-xl items-center"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="text-white font-bold text-lg">Đăng nhập / Đăng ký</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text-primary">Tài khoản</Text>
        <TouchableOpacity className="p-2 -mr-2" onPress={() => router.push('/settings')}>
          <Settings size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="bg-surface p-6 items-center border-b border-border">
          <View className="w-24 h-24 rounded-full bg-primary-soft items-center justify-center mb-4 overflow-hidden">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />
            ) : (
              <User size={40} color={colors.primary.DEFAULT} />
            )}
          </View>
          <Text className="text-2xl font-bold text-text-primary mb-1">
            {isLoading ? 'Loading...' : user?.fullName}
          </Text>
          <Text className="text-text-secondary">{user?.email}</Text>
          
          <View className="flex-row items-center mt-3 bg-primary-soft px-4 py-2 rounded-full">
            <ShieldCheck size={16} color="#2F855A" />
            <Text className="text-text-secondary text-xs ml-2">Độ uy tín</Text>
            <Text className="text-success font-bold ml-1">{user?.trustScore || 0}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="p-4">
          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Tài sản của tôi</Text>
          <View className="mb-6">
            <TouchableOpacity className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center" onPress={() => router.push('/asset/create')}>
              <View className="flex-row items-center">
                <PlusCircle size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Tạo bài đăng</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface p-4 rounded-xl border border-border flex-row justify-between items-center" onPress={() => router.push('/profile/listings')}>
              <View className="flex-row items-center">
                <List size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Quản lý bài đăng</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Tài khoản</Text>
          <View className="mb-6">
            <TouchableOpacity className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center" onPress={() => router.push('/profile/kyc')}>
              <View className="flex-row items-center">
                <ShieldCheck size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Xác thực danh tính (KYC)</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center" onPress={() => router.push('/support')}>
              <View className="flex-row items-center">
                <HelpCircle size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Hỗ trợ</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="bg-surface p-4 rounded-xl border border-border flex-row justify-between items-center"
              onPress={handleLogout}
            >
              <View className="flex-row items-center">
                <LogOut size={22} color="#DC5C5C" className="mr-3" />
                <Text className="font-semibold text-danger">Đăng xuất</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
