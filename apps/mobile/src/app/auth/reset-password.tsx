import { zodResolver } from '@hookform/resolvers/zod';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

const resetSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
      .regex(/[a-z]/, 'Cần ít nhất một chữ thường')
      .regex(/[A-Z]/, 'Cần ít nhất một chữ hoa')
      .regex(/[0-9]/, 'Cần ít nhất một chữ số'),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirmPassword'],
  });

type ResetForm = z.infer<typeof resetSchema>;

type ApiErrorResponse = {
  error?: {
    message?: string | string[];
  };
  message?: string | string[];
};

function getApiErrorMessage(error: unknown, fallback: string) {
  const response = (
    error as {
      response?: {
        data?: ApiErrorResponse;
      };
    }
  ).response?.data;
  const message = response?.error?.message ?? response?.message;

  if (Array.isArray(message)) {
    return message.join('\n');
  }

  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
}

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const submit = handleSubmit(async ({ password }) => {
    if (!token) {
      setSubmitError('Token đặt lại mật khẩu bị thiếu.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      await apiClient.post('/auth/reset-password', { token, newPassword: password });
      setIsSuccess(true);
    } catch (error) {
      setSubmitError(
        getApiErrorMessage(
          error,
          'Liên kết có thể đã hết hạn hoặc đã được sử dụng.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <LinearGradient colors={['#E7F2ED', '#F8FBF9', '#EEF3F1']} style={{ flex: 1 }}>
      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View className="px-5 pt-2">
            <Pressable
              accessibilityLabel="Quay lại"
              className="h-12 w-12 items-center justify-center rounded-full border border-white/70 bg-white/60"
              onPress={() => router.back()}
            >
              <ChevronLeft size={25} color={colors.text.primary} />
            </Pressable>
          </View>

          <View className="flex-1 justify-center px-6 pb-12">
            <View className="mb-7 h-16 w-16 items-center justify-center rounded-2xl bg-primary">
              <KeyRound size={31} color="white" />
            </View>
            <Text className="text-3xl font-extrabold tracking-tight text-text-primary">
              Tạo mật khẩu mới
            </Text>
            <Text className="mt-2 max-w-md text-base leading-6 text-text-secondary">
              Chọn mật khẩu riêng biệt, có chữ hoa, chữ thường và chữ số.
            </Text>

            {isSuccess ? (
              <View className="mt-8 rounded-2xl border border-success/30 bg-success/10 p-5">
                <View className="flex-row items-center">
                  <CheckCircle2 size={22} color={colors.success} />
                  <Text className="ml-2 flex-1 font-bold text-text-primary">
                    Mật khẩu đã được cập nhật
                  </Text>
                </View>
                <Text className="mt-2 leading-5 text-text-secondary">
                  Bạn có thể đăng nhập lại bằng mật khẩu mới. Các phiên cũ đã được vô hiệu hóa.
                </Text>
                <Pressable
                  className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary"
                  onPress={() => router.replace('/auth/login')}
                  accessibilityRole="button"
                  accessibilityLabel="Đăng nhập"
                >
                  <Text className="font-bold text-white">Đăng nhập</Text>
                </Pressable>
              </View>
            ) : !token ? (
              <View className="mt-8 rounded-2xl border border-danger/30 bg-danger/10 p-5">
                <Text className="font-bold text-danger">Liên kết đặt lại không hợp lệ</Text>
                <Text className="mt-1 leading-5 text-text-secondary">
                  Hãy yêu cầu một email đặt lại mật khẩu mới.
                </Text>
                <Pressable
                  className="mt-5 min-h-12 items-center justify-center rounded-xl bg-primary"
                  onPress={() => router.replace('/auth/forgot-password')}
                >
                  <Text className="font-bold text-white">Gửi lại yêu cầu</Text>
                </Pressable>
              </View>
            ) : (
              <View className="mt-8 gap-5">
                {submitError ? (
                  <View
                    className="flex-row rounded-2xl border border-danger/20 bg-danger/10 px-4 py-3"
                    accessibilityRole="alert"
                  >
                    <AlertCircle size={20} color={colors.danger} />
                    <Text className="ml-3 flex-1 text-sm leading-5 text-danger">
                      {submitError}
                    </Text>
                  </View>
                ) : null}

                <PasswordField
                  control={control}
                  name="password"
                  label="Mật khẩu mới"
                  error={errors.password?.message}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />
                <PasswordField
                  control={control}
                  name="confirmPassword"
                  label="Nhập lại mật khẩu"
                  error={errors.confirmPassword?.message}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />

                <View className="flex-row items-center rounded-xl bg-primary-soft p-4">
                  <CheckCircle2 size={19} color={colors.primary.DEFAULT} />
                  <Text className="ml-3 flex-1 text-sm leading-5 text-primary-dark">
                    Sau khi đổi mật khẩu, mọi phiên đăng nhập cũ sẽ bị vô hiệu hóa.
                  </Text>
                </View>

                <Pressable
                  className={`min-h-14 items-center justify-center rounded-xl bg-primary ${
                    isSubmitting ? 'opacity-70' : ''
                  }`}
                  disabled={isSubmitting}
                  onPress={() => void submit()}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-bold text-white">Cập nhật mật khẩu</Text>
                  )}
                </Pressable>
              </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

type PasswordFieldProps = {
  control: ReturnType<typeof useForm<ResetForm>>['control'];
  name: 'password' | 'confirmPassword';
  label: string;
  error?: string;
  visible: boolean;
  onToggle: () => void;
};

function PasswordField({
  control,
  name,
  label,
  error,
  visible,
  onToggle,
}: PasswordFieldProps) {
  return (
    <View>
      <Text className="mb-2 font-semibold text-text-primary">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <View
            className={`min-h-14 flex-row items-center rounded-xl border bg-white/75 px-4 ${
              error ? 'border-danger' : 'border-white'
            }`}
          >
            <TextInput
              className="flex-1 text-base text-text-primary"
              value={value}
              onBlur={onBlur}
              onChangeText={onChange}
              placeholder="Tối thiểu 8 ký tự"
              placeholderTextColor={colors.text.muted}
              secureTextEntry={!visible}
              autoCapitalize="none"
              textContentType="newPassword"
            />
            <Pressable
              accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              className="h-11 w-11 items-center justify-center"
              onPress={onToggle}
            >
              {visible ? (
                <EyeOff size={20} color={colors.text.secondary} />
              ) : (
                <Eye size={20} color={colors.text.secondary} />
              )}
            </Pressable>
          </View>
        )}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
