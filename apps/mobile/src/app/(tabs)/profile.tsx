import { colors } from '../../theme/colors';
import { View, Text, TouchableOpacity, ScrollView, Image, Alert, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Camera, LogOut, User, Settings, ShieldCheck, List, PlusCircle, HelpCircle, ChevronRight, LayoutDashboard, Megaphone } from 'lucide-react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { User as UserType } from '../../types/domain';

export default function ProfileScreen() {
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const response = await apiClient.get<UserType>('/auth/me');
      return response.data;
    },
    enabled: isAuthenticated,
  });

  const handleLogout = async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch (e) {
      console.warn('Logout API failed', e);
    }
    logout();
    router.replace('/auth/login');
  };
  const canAccessAdmin =
    user?.roles?.some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN') ?? false;

  const updateAvatar = async (asset: ImagePicker.ImagePickerAsset) => {
    setIsUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        name: asset.fileName ?? `avatar-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      const upload = await apiClient.post<{ url: string }>('/assets/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30_000,
      });
      await apiClient.patch('/users/me', { avatarUrl: upload.data.url });
      await queryClient.invalidateQueries({ queryKey: ['me'] });
      Alert.alert('Đã cập nhật ảnh đại diện', 'Ảnh đại diện mới đã được lưu.');
    } catch {
      Alert.alert('Không thể cập nhật ảnh', 'Kiểm tra kết nối và thử lại.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const chooseAvatarSource = () => {
    Alert.alert('Ảnh đại diện', 'Chọn cách thêm ảnh', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Chụp ảnh',
        onPress: async () => {
          const permission = await ImagePicker.requestCameraPermissionsAsync();
          if (!permission.granted) {
            Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh đại diện.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled && result.assets[0]) await updateAvatar(result.assets[0]);
        },
      },
      {
        text: 'Chọn từ thư viện',
        onPress: async () => {
          const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsEditing: true, aspect: [1, 1] });
          if (!result.canceled && result.assets[0]) await updateAvatar(result.assets[0]);
        },
      },
    ]);
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
        <TouchableOpacity className="p-2 -mr-2" onPress={() => router.push('/settings' as any)}>
          <Settings size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* Profile Header */}
        <View className="bg-surface pt-6 pb-8 items-center border-b border-border shadow-sm">
          <View className="relative mb-5 h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-primary-soft shadow-sm">
            {user?.avatarUrl ? (
              <Image source={{ uri: user.avatarUrl }} className="h-full w-full rounded-full" />
            ) : (
              <User size={48} color={colors.primary.DEFAULT} />
            )}
            <TouchableOpacity
              accessibilityLabel="Đổi ảnh đại diện"
              className="absolute bottom-0 right-0 h-9 w-9 items-center justify-center rounded-full border-2 border-white bg-primary"
              disabled={isUploadingAvatar}
              onPress={chooseAvatarSource}
            >
              {isUploadingAvatar ? <ActivityIndicator color="white" size="small" /> : <Camera size={17} color="white" />}
            </TouchableOpacity>
          </View>
          <Text className="text-2xl font-extrabold text-text-primary mb-1 tracking-tight">
            {isLoading ? 'Đang tải...' : user?.fullName || 'Người dùng'}
          </Text>
          <Text className="text-text-secondary font-medium">{user?.email}</Text>
          
          <View className="mt-6 flex-row items-center rounded-2xl border border-border bg-surfaceSecondary px-7 py-4">
            <View className="items-center">
              <View className="flex-row items-center mb-1">
                <ShieldCheck size={16} color={colors.primary.DEFAULT} />
                <Text className="ml-1.5 text-base font-bold text-text-primary">
                  {user?.trustScore ?? 0}
                </Text>
              </View>
              <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Điểm uy tín</Text>
            </View>
            <View className="mx-7 h-8 w-px bg-border" />
            <View className="min-w-24 items-center">
              <View className="flex-row items-center mb-1">
                <ShieldCheck
                  size={16}
                  color={
                    user?.verificationStatus === 'VERIFIED'
                      ? colors.success
                      : colors.warning
                  }
                />
                <Text className="ml-1.5 text-sm font-bold text-text-primary">
                  {user?.verificationStatus === 'VERIFIED' ? 'Đã xác thực' : 'Chưa xác thực'}
                </Text>
              </View>
              <Text className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">Danh tính</Text>
            </View>
          </View>
        </View>

        {/* Menu Items */}
        <View className="p-5">
          {canAccessAdmin ? (
            <>
              <Text className="text-[13px] font-extrabold text-text-secondary uppercase mb-3 ml-1 tracking-widest">Quản trị</Text>
              <View className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-6">
                <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center border-b border-gray-100" onPress={() => router.push('/admin' as any)}>
                  <View className="flex-row items-center">
                    <LayoutDashboard size={22} color={colors.primary.DEFAULT} className="mr-3" />
                    <Text className="font-semibold text-text-primary text-base">Bảng điều khiển quản trị</Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
                <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center" onPress={() => router.push('/admin/announcements' as any)}>
                  <View className="flex-row items-center">
                    <Megaphone size={22} color={colors.primary.DEFAULT} className="mr-3" />
                    <Text className="font-semibold text-text-primary text-base">Thông báo admin</Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          {!canAccessAdmin ? (
            <>
              <Text className="text-[13px] font-extrabold text-text-secondary uppercase mb-3 ml-1 tracking-widest">Tài sản của tôi</Text>
              <View className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-6">
                <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center border-b border-gray-100" onPress={() => router.push('/asset/create')}>
                  <View className="flex-row items-center">
                    <PlusCircle size={22} color={colors.primary.DEFAULT} className="mr-3" />
                    <Text className="font-semibold text-text-primary text-base">Tạo bài đăng mới</Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>

                <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center" onPress={() => router.push('/profile/listings' as any)}>
                  <View className="flex-row items-center">
                    <List size={22} color={colors.primary.DEFAULT} className="mr-3" />
                    <Text className="font-semibold text-text-primary text-base">Quản lý bài đăng</Text>
                  </View>
                  <ChevronRight size={20} color="#9CA3AF" />
                </TouchableOpacity>
              </View>
            </>
          ) : null}

          <Text className="text-[13px] font-extrabold text-text-secondary uppercase mb-3 ml-1 tracking-widest">Tài khoản</Text>
          <View className="bg-surface rounded-2xl border border-border overflow-hidden shadow-sm mb-6">
            <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center border-b border-gray-100" onPress={() => router.push('/profile/kyc' as any)}>
              <View className="flex-row items-center">
                <ShieldCheck size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary text-base">Xác thực danh tính (KYC)</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>

            <TouchableOpacity className="px-5 py-4 flex-row justify-between items-center border-b border-gray-100" onPress={() => router.push('/support' as any)}>
              <View className="flex-row items-center">
                <HelpCircle size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary text-base">Hỗ trợ & CSKH</Text>
              </View>
              <ChevronRight size={20} color="#9CA3AF" />
            </TouchableOpacity>
            
            <TouchableOpacity 
              className="px-5 py-4 flex-row justify-between items-center bg-danger/5"
              onPress={handleLogout}
            >
              <View className="flex-row items-center">
                <LogOut size={22} color="#DC5C5C" className="mr-3" />
                <Text className="font-bold text-danger text-base">Đăng xuất</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
