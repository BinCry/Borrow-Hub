import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Bell, Shield, Moon, Globe, HelpCircle } from 'lucide-react-native';
import { colors } from '../theme/colors';
import { useState } from 'react';

export default function SettingsScreen() {
  const router = useRouter();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Cài đặt</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1">
        <View className="p-4">
          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Tùy chọn chung</Text>
          <View className="mb-6">
            <View className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Bell size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Thông báo đẩy</Text>
              </View>
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#D1D5DB', true: colors.primary.DEFAULT }}
              />
            </View>

            <View className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Moon size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Chế độ tối (Dark Mode)</Text>
              </View>
              <Switch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#D1D5DB', true: colors.primary.DEFAULT }}
              />
            </View>

            <TouchableOpacity className="bg-surface p-4 rounded-xl border border-border flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Globe size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Ngôn ngữ</Text>
              </View>
              <Text className="text-text-secondary">Tiếng Việt</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-xs font-bold text-text-secondary uppercase mb-2 ml-2">Bảo mật</Text>
          <View className="mb-6">
            <TouchableOpacity className="bg-surface p-4 rounded-xl mb-3 border border-border flex-row justify-between items-center">
              <View className="flex-row items-center">
                <Shield size={22} color={colors.primary.DEFAULT} className="mr-3" />
                <Text className="font-semibold text-text-primary">Đổi mật khẩu</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
