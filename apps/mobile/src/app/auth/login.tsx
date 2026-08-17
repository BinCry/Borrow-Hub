import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView, ImageBackground, StatusBar, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

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
      const payload = {
        identifier: data.email,
        password: data.password
      };
      const response = await apiClient.post('/auth/login', payload);
      const token = response.data.tokens.accessToken;
      setAuth(token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Đăng nhập thất bại', error.response?.data?.message || 'Đã có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const { height } = Dimensions.get('window');

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      
      {/* Background Image with Gradient Overlay */}
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-gray-900">
        <Image 
          source={require('../../../assets/images/7a637e61-0a17-4e85-a292-b0d86c9a61e8.png')} 
          style={{ position: 'absolute', width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(17,24,39,0.3)', 'rgba(17,24,39,0.5)', 'rgba(17,24,39,0.7)']}
          locations={[0, 0.4, 0.7]}
          style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
        />
      </View>

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }}
            keyboardShouldPersistTaps="handled"
            bounces={false}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Form Card */}
            <View className="bg-surface px-6 pt-10 pb-8 rounded-3xl shadow-xl w-full">
              <View className="mb-8">
                <Text className="text-3xl font-extrabold text-text-primary tracking-tight">Chào mừng trở lại</Text>
                <Text className="text-text-secondary mt-2 text-base">Đăng nhập để khám phá hàng ngàn món đồ độc đáo.</Text>
              </View>

        <View className="mb-4">
          <Text className="text-text-primary mb-2 font-medium">Email</Text>
          <Controller
            control={control}
            name="email"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surfaceSecondary border border-border rounded-xl px-4 py-3.5 text-text-primary font-medium"
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
                className="bg-surfaceSecondary border border-border rounded-xl px-4 py-3.5 text-text-primary font-medium"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Nhập mật khẩu"
                secureTextEntry
              />
            )}
          />
          {errors.password && <Text className="text-danger mt-1 text-sm">{errors.password.message}</Text>}
          <TouchableOpacity 
            className="mt-3 items-end"
            onPress={() => router.push('/auth/forgot-password' as any)}
          >
            <Text className="text-primary font-medium">Quên mật khẩu?</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity 
          className={`bg-primary rounded-xl py-4 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
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
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
