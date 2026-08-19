import { useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  LifeBuoy,
  FileText,
  ShieldAlert,
  Trash2,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

const LEGAL_BASE_URL =
  process.env.EXPO_PUBLIC_LEGAL_BASE_URL ??
  (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000/api/v1').replace(
    /\/api\/v1\/?$/,
    '',
  );

export default function SettingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const logout = useAuthStore((state) => state.logout);
  const [isDeleting, setIsDeleting] = useState(false);

  const deleteAccount = async () => {
    setIsDeleting(true);
    try {
      await apiClient.delete('/users/me/account');
      queryClient.clear();
      await logout();
      router.replace('/auth/login');
    } catch (error) {
      const apiMessage =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
      Alert.alert(
        'Không thể xóa tài khoản',
        apiMessage ?? 'Vui lòng hoàn tất các đơn thuê đang hoạt động rồi thử lại.',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDeleteAccount = () => {
    Alert.alert(
      'Xóa tài khoản vĩnh viễn?',
      'Thông tin định danh tài khoản sẽ bị vô hiệu hóa và bạn sẽ đăng xuất ngay. Thao tác này không thể hoàn tác.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Tiếp tục',
          style: 'destructive',
          onPress: () =>
            Alert.alert(
              'Xác nhận lần cuối',
              'Bạn chắc chắn muốn xóa tài khoản Borrow Hub?',
              [
                { text: 'Không', style: 'cancel' },
                {
                  text: 'Xóa tài khoản',
                  style: 'destructive',
                  onPress: () => void deleteAccount(),
                },
              ],
            ),
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-extrabold text-text-primary">Cài đặt</Text>
        <View className="w-11" />
      </View>

      <ScrollView className="flex-1" contentContainerClassName="p-5 pb-10">
        <Text className="mb-3 ml-1 text-xs font-extrabold uppercase tracking-widest text-text-secondary">
          Tài khoản và bảo mật
        </Text>
        <View className="mb-7 overflow-hidden rounded-2xl border border-border bg-surface">
          <SettingsRow
            icon={<Bell size={22} color={colors.primary.DEFAULT} />}
            label="Thông báo"
            onPress={() => router.push('/notifications' as never)}
          />
          <SettingsRow
            icon={<KeyRound size={22} color={colors.primary.DEFAULT} />}
            label="Đặt lại mật khẩu qua email"
            onPress={() => router.push('/auth/forgot-password')}
          />
          <SettingsRow
            icon={<ShieldAlert size={22} color={colors.primary.DEFAULT} />}
            label="Xác thực danh tính"
            onPress={() => router.push('/profile/kyc')}
            last
          />
        </View>

        <Text className="mb-3 ml-1 text-xs font-extrabold uppercase tracking-widest text-text-secondary">
          Hỗ trợ
        </Text>
        <View className="mb-7 overflow-hidden rounded-2xl border border-border bg-surface">
          <SettingsRow
            icon={<LifeBuoy size={22} color={colors.primary.DEFAULT} />}
            label="Phiếu hỗ trợ của tôi"
            onPress={() => router.push('/support')}
          />
          <SettingsRow
            icon={<FileText size={22} color={colors.primary.DEFAULT} />}
            label="Chính sách quyền riêng tư"
            onPress={() => void WebBrowser.openBrowserAsync(`${LEGAL_BASE_URL}/privacy`)}
            last
          />
        </View>

        <Text className="mb-3 ml-1 text-xs font-extrabold uppercase tracking-widest text-danger">
          Vùng nguy hiểm
        </Text>
        <TouchableOpacity
          accessibilityRole="button"
          className="min-h-14 flex-row items-center rounded-2xl border border-danger/30 bg-danger/5 px-4"
          disabled={isDeleting}
          onPress={confirmDeleteAccount}
        >
          {isDeleting ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Trash2 size={22} color={colors.danger} />
          )}
          <View className="ml-3 flex-1">
            <Text className="font-extrabold text-danger">Xóa tài khoản</Text>
            <Text className="mt-0.5 text-xs text-text-secondary">
              Chỉ thực hiện được khi không còn đơn thuê hoạt động
            </Text>
          </View>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsRow({
  icon,
  label,
  onPress,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <TouchableOpacity
      accessibilityRole="button"
      className={`min-h-14 flex-row items-center px-4 ${last ? '' : 'border-b border-border'}`}
      onPress={onPress}
    >
      {icon}
      <Text className="ml-3 flex-1 font-bold text-text-primary">{label}</Text>
      <ChevronRight size={20} color={colors.text.muted} />
    </TouchableOpacity>
  );
}
