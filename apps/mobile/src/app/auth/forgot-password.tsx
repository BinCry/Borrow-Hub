import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { StatusBar } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { Image } from 'expo-image';
import { ShieldCheck } from 'lucide-react-native';
import { colors } from '../../theme/colors';

const forgotPasswordSchema = z.object({
  email: z.string().email('Email không hợp lệ'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      await apiClient.post('/auth/forgot-password', data);
      setIsSuccess(true);
    } catch (error: any) {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể yêu cầu khôi phục mật khẩu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar barStyle="light-content" />
      
      {/* Background Image with Gradient Overlay */}
      <View className="absolute top-0 left-0 right-0 bottom-0 bg-gray-900">
        <Image 
          source={require('../../../assets/images/7a637e61-0a17-4e85-a292-b0d86c9a61e8.png')} 
          style={{ position: 'absolute', width: '100%', height: '100%' }}
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
              {isSuccess ? (
                <View className="items-center py-6">
                  <View className="w-20 h-20 bg-primary-soft rounded-full items-center justify-center mb-6">
                    <ShieldCheck size={40} color={colors.primary.DEFAULT} />
                  </View>
                  <Text className="text-2xl font-extrabold text-text-primary mb-3 text-center tracking-tight">Kiểm tra email</Text>
                  <Text className="text-text-secondary text-center px-4 mb-8 leading-6 text-base">
                    Chúng tôi đã gửi hướng dẫn khôi phục mật khẩu. Vui lòng kiểm tra hộp thư đến (và thư mục rác).
                  </Text>
                  
                  <TouchableOpacity 
                    className="bg-primary rounded-xl py-4 items-center shadow-sm w-full"
                    onPress={() => router.push('/auth/login')}
                  >
                    <Text className="text-white font-semibold text-lg">Quay lại đăng nhập</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View className="mb-8">
                    <Text className="text-3xl font-extrabold text-text-primary tracking-tight">Khôi phục mật khẩu</Text>
                    <Text className="text-text-secondary mt-2 text-base leading-6">Nhập email của bạn để nhận liên kết đặt lại mật khẩu an toàn.</Text>
                  </View>

                  <View className="mb-8">
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
                          placeholder="Nhập email đã đăng ký"
                          keyboardType="email-address"
                          autoCapitalize="none"
                        />
                      )}
                    />
                    {errors.email && <Text className="text-danger mt-1 text-sm">{errors.email.message}</Text>}
                  </View>

                  <TouchableOpacity 
                    className={`bg-primary rounded-xl py-4 items-center shadow-sm ${loading ? 'opacity-70' : ''}`}
                    onPress={handleSubmit(onSubmit)}
                    disabled={loading}
                  >
                    <Text className="text-white font-semibold text-lg">{loading ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu'}</Text>
                  </TouchableOpacity>

                  <View className="flex-row justify-center mt-6 mb-4">
                    <Link href="/auth/login" asChild>
                      <TouchableOpacity>
                        <Text className="text-primary font-semibold">Quay lại đăng nhập</Text>
                      </TouchableOpacity>
                    </Link>
                  </View>
                </>
              )}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
