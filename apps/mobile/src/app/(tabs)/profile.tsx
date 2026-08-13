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
      <SafeAreaView className="flex-1 bg-background items-center justify-center px-6">
        <User size={64} color="#9CA3AF" className="mb-4" />
        <Text className="text-xl font-bold text-text-primary mb-2">Not Logged In</Text>
        <Text className="text-text-secondary text-center mb-6">
          Login to manage your profile, rentals, and listings.
        </Text>
        <TouchableOpacity 
          className="bg-primary w-full py-4 rounded-xl items-center"
          onPress={() => router.push('/auth/login')}
        >
          <Text className="text-white font-bold text-lg">Login / Sign Up</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="px-4 py-4 bg-surface border-b border-border z-10 flex-row justify-between items-center">
        <Text className="text-2xl font-bold text-text-primary">Profile</Text>
        <TouchableOpacity onPress={() => router.push('/settings')}>
          <Settings size={24} color="#4F7C6B" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="bg-surface p-6 items-center border-b border-border">
          <View className="w-24 h-24 rounded-full bg-primary-soft items-center justify-center mb-4 overflow-hidden">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="w-full h-full" />
            ) : (
              <User size={40} color="#4F7C6B" />
            )}
          </View>
          <Text className="text-2xl font-bold text-text-primary mb-1">
            {isLoading ? 'Loading...' : user?.fullName}
          </Text>
          <Text className="text-text-secondary">{user?.email}</Text>
          
          <View className="flex-row items-center mt-3 bg-primary-soft px-3 py-1.5 rounded-full">
            <ShieldCheck size={16} color="#2F855A" />
            <Text className="text-success font-semibold ml-2">Trust Score: {user?.trustScore || 0}</Text>
          </View>
        </View>

        {/* Menu Items */}
        <View className="p-4">
          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Owner Tools</Text>
          <View className="bg-surface rounded-xl border border-border mb-6 overflow-hidden">
            <TouchableOpacity 
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/asset/create')}
            >
              <PlusCircle size={22} color="#4F7C6B" className="mr-3" />
              <Text className="flex-1 text-base font-medium text-text-primary">Create Listing</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-4"
              onPress={() => router.push('/profile/listings')}
            >
              <List size={22} color="#4F7C6B" className="mr-3" />
              <Text className="flex-1 text-base font-medium text-text-primary">My Listings</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Account</Text>
          <View className="bg-surface rounded-xl border border-border mb-6 overflow-hidden">
            <TouchableOpacity 
              className="flex-row items-center p-4 border-b border-border"
              onPress={() => router.push('/profile/kyc')}
            >
              <ShieldCheck size={22} color="#4F7C6B" className="mr-3" />
              <Text className="flex-1 text-base font-medium text-text-primary">Identity Verification</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              className="flex-row items-center p-4"
              onPress={() => router.push('/support')}
            >
              <HelpCircle size={22} color="#4F7C6B" className="mr-3" />
              <Text className="flex-1 text-base font-medium text-text-primary">Support & FAQ</Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            className="flex-row items-center p-4 bg-surface rounded-xl border border-border mt-4"
            onPress={handleLogout}
          >
            <LogOut size={22} color="#DC5C5C" className="mr-3" />
            <Text className="flex-1 text-base font-medium text-danger">Logout</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
