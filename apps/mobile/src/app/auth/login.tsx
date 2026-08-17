import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

const loginSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/login', data);
      const token = response.data.accessToken;
      setAuth(token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', error.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 justify-center px-6"
      >
        <View className="mb-10">
          <Text className="text-3xl font-bold text-primary">Chào mừng trở lại</Text>
          <Text className="text-text-secondary mt-2">Đăng nhập để tiếp tục</Text>
        </View>

        <View className="mb-4">
          <Text className="text-text-primary mb-2 font-medium">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Nhập email của bạn"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && <Text className="text-danger mt-1 text-sm">{errors.email.message}</Text>}
        </View>

        <View className="mb-6">
          <Text className="text-text-primary mb-2 font-medium">Mật khẩu</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Nhập mật khẩu"
                secureTextEntry
              />
            )}
          />
          {errors.password && <Text className="text-danger mt-1 text-sm">{errors.password.message}</Text>}
        </View>

        <TouchableOpacity 
          className={`bg-primary rounded-lg py-4 items-center ${loading ? 'opacity-70' : ''}`}
          onPress={handleSubmit(onSubmit)}
          disabled={loading}
        >
          <Text className="text-white font-semibold text-lg">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-text-secondary">Chưa có tài khoản? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text className="text-primary font-semibold">Đăng ký</Text>
            </TouchableOpacity>
          </Link>
        </View>
        
        {/* Bypass login for dev/browsing */}
        <View className="flex-row justify-center mt-6">
          <Link href="/(tabs)" asChild>
            <TouchableOpacity>
              <Text className="text-text-secondary underline">Tiếp tục dưới dạng Khách</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
