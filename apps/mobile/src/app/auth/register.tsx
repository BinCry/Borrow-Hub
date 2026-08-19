import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { colors } from '../../theme/colors';

const vietnamesePhonePattern = /^(?:\+84|0)\d{9}$/;

const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(80, 'Họ và tên không được vượt quá 80 ký tự'),
  email: z.email('Email chưa đúng định dạng'),
  phone: z
    .string()
    .trim()
    .refine(
      (value) => vietnamesePhonePattern.test(value.replace(/\s/g, '')),
      'Số điện thoại Việt Nam chưa đúng định dạng',
    ),
  password: z
    .string()
    .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
    .regex(/[A-Za-z]/, 'Mật khẩu cần có ít nhất một chữ cái')
    .regex(/\d/, 'Mật khẩu cần có ít nhất một chữ số'),
});

type RegisterForm = z.infer<typeof registerSchema>;

type AuthResponse = {
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
};

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

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const { width } = useWindowDimensions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const horizontalPadding = width < 380 ? 20 : 28;

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const response = await apiClient.post<AuthResponse>('/auth/register', {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.replace(/\s/g, ''),
        password: data.password,
      });

      await setAuth(
        response.data.tokens.accessToken,
        response.data.tokens.refreshToken,
      );
      router.replace('/(tabs)');
    } catch (error: unknown) {
      setSubmitError(
        getApiErrorMessage(
          error,
          'Không thể tạo tài khoản. Kiểm tra kết nối và thử lại.',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent={Platform.OS === 'android'}
      />

      <Image
        source={require('../../../assets/images/auth-background-v2.png')}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="center"
        transition={220}
        priority="high"
        accessible={false}
      />
      <LinearGradient
        colors={[
          'rgba(247,248,245,0.04)',
          'rgba(247,248,245,0.68)',
          'rgba(247,248,245,0.98)',
        ]}
        locations={[0, 0.3, 0.64]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <SafeAreaView className="flex-1" edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              { paddingHorizontal: horizontalPadding },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.contentColumn}>
              <View className="flex-row items-center justify-between">
                <Pressable
                  className="h-12 w-12 items-center justify-center rounded-2xl bg-white/55"
                  onPress={() => router.back()}
                  accessibilityRole="button"
                  accessibilityLabel="Quay lại"
                  hitSlop={4}
                  style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}
                >
                  <ArrowLeft
                    size={22}
                    color={colors.text.primary}
                    strokeWidth={1.9}
                  />
                </Pressable>

                <View
                  className="flex-row items-center"
                  accessible
                  accessibilityRole="header"
                  accessibilityLabel="Borrow Hub"
                >
                  <View className="h-10 w-10 items-center justify-center rounded-2xl bg-primary">
                    <Image
                      source={require('../../../assets/images/borrow-hub-mark-v2.png')}
                      style={{ width: 29, height: 29 }}
                      contentFit="contain"
                    />
                  </View>
                  <Text className="ml-2.5 text-[11px] font-semibold uppercase tracking-[2.2px] text-primary-dark">
                    Borrow Hub
                  </Text>
                </View>
              </View>

              <View className="mt-12">
                <Text className="text-[34px] font-bold leading-[40px] tracking-[-0.8px] text-text-primary">
                  Tạo tài khoản
                </Text>
                <Text className="mt-3 max-w-[380px] text-base leading-6 text-text-secondary">
                  Tham gia cộng đồng thuê và chia sẻ đồ dùng với thông tin minh bạch, lịch sử rõ ràng.
                </Text>

                {submitError ? (
                  <View
                    className="mt-5 flex-row rounded-2xl border border-danger/20 bg-white/75 px-4 py-3"
                    accessibilityRole="alert"
                  >
                    <AlertCircle
                      size={20}
                      color={colors.danger}
                      strokeWidth={1.9}
                    />
                    <Text className="ml-3 flex-1 text-sm leading-5 text-danger">
                      {submitError}
                    </Text>
                  </View>
                ) : null}

                <View className="mt-7">
                  <Text className="mb-2 text-sm font-semibold text-text-primary">
                    Họ và tên
                  </Text>
                  <Controller
                    control={control}
                    name="fullName"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View
                        className={
                          'h-[54px] flex-row items-center rounded-2xl border bg-white/70 px-4 ' +
                          (errors.fullName ? 'border-danger/60' : 'border-white')
                        }
                      >
                        <UserRound
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={1.8}
                        />
                        <TextInput
                          className="ml-3 h-full flex-1 text-base text-text-primary"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Nguyễn Minh An"
                          placeholderTextColor={colors.text.muted}
                          autoCapitalize="words"
                          autoComplete="name"
                          textContentType="name"
                          returnKeyType="next"
                          selectionColor={colors.primary.DEFAULT}
                          accessibilityLabel="Họ và tên"
                        />
                      </View>
                    )}
                  />
                  {errors.fullName ? (
                    <Text
                      className="mt-2 text-sm leading-5 text-danger"
                      accessibilityRole="alert"
                    >
                      {errors.fullName.message}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5">
                  <Text className="mb-2 text-sm font-semibold text-text-primary">
                    Email
                  </Text>
                  <Controller
                    control={control}
                    name="email"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View
                        className={
                          'h-[54px] flex-row items-center rounded-2xl border bg-white/70 px-4 ' +
                          (errors.email ? 'border-danger/60' : 'border-white')
                        }
                      >
                        <Mail
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={1.8}
                        />
                        <TextInput
                          className="ml-3 h-full flex-1 text-base text-text-primary"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="ban@example.com"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="email"
                          textContentType="emailAddress"
                          importantForAutofill="yes"
                          returnKeyType="next"
                          selectionColor={colors.primary.DEFAULT}
                          accessibilityLabel="Email"
                        />
                      </View>
                    )}
                  />
                  {errors.email ? (
                    <Text
                      className="mt-2 text-sm leading-5 text-danger"
                      accessibilityRole="alert"
                    >
                      {errors.email.message}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5">
                  <Text className="mb-2 text-sm font-semibold text-text-primary">
                    Số điện thoại
                  </Text>
                  <Controller
                    control={control}
                    name="phone"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View
                        className={
                          'h-[54px] flex-row items-center rounded-2xl border bg-white/70 px-4 ' +
                          (errors.phone ? 'border-danger/60' : 'border-white')
                        }
                      >
                        <Phone
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={1.8}
                        />
                        <TextInput
                          className="ml-3 h-full flex-1 text-base text-text-primary"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="0912 345 678"
                          placeholderTextColor={colors.text.muted}
                          keyboardType="phone-pad"
                          autoComplete="tel"
                          textContentType="telephoneNumber"
                          importantForAutofill="yes"
                          returnKeyType="next"
                          selectionColor={colors.primary.DEFAULT}
                          accessibilityLabel="Số điện thoại"
                        />
                      </View>
                    )}
                  />
                  {errors.phone ? (
                    <Text
                      className="mt-2 text-sm leading-5 text-danger"
                      accessibilityRole="alert"
                    >
                      {errors.phone.message}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5">
                  <Text className="mb-2 text-sm font-semibold text-text-primary">
                    Mật khẩu
                  </Text>
                  <Controller
                    control={control}
                    name="password"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View
                        className={
                          'h-[54px] flex-row items-center rounded-2xl border bg-white/70 pl-4 ' +
                          (errors.password ? 'border-danger/60' : 'border-white')
                        }
                      >
                        <KeyRound
                          size={20}
                          color={colors.text.secondary}
                          strokeWidth={1.8}
                        />
                        <TextInput
                          className="ml-3 h-full flex-1 text-base text-text-primary"
                          value={value}
                          onChangeText={onChange}
                          onBlur={onBlur}
                          placeholder="Tối thiểu 8 ký tự"
                          placeholderTextColor={colors.text.muted}
                          secureTextEntry={!isPasswordVisible}
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="new-password"
                          textContentType="newPassword"
                          passwordRules="minlength: 8; required: lower; required: digit;"
                          importantForAutofill="yes"
                          returnKeyType="done"
                          onSubmitEditing={handleSubmit(onSubmit)}
                          selectionColor={colors.primary.DEFAULT}
                          accessibilityLabel="Mật khẩu"
                        />
                        <Pressable
                          className="h-12 w-12 items-center justify-center"
                          onPress={() => setIsPasswordVisible((current) => !current)}
                          accessibilityRole="button"
                          accessibilityLabel={
                            isPasswordVisible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'
                          }
                          accessibilityState={{ expanded: isPasswordVisible }}
                          hitSlop={4}
                          style={({ pressed }) => ({
                            opacity: pressed ? 0.58 : 1,
                          })}
                        >
                          {isPasswordVisible ? (
                            <EyeOff
                              size={20}
                              color={colors.text.secondary}
                              strokeWidth={1.8}
                            />
                          ) : (
                            <Eye
                              size={20}
                              color={colors.text.secondary}
                              strokeWidth={1.8}
                            />
                          )}
                        </Pressable>
                      </View>
                    )}
                  />
                  {errors.password ? (
                    <Text
                      className="mt-2 text-sm leading-5 text-danger"
                      accessibilityRole="alert"
                    >
                      {errors.password.message}
                    </Text>
                  ) : (
                    <Text className="mt-2 text-xs leading-5 text-text-secondary">
                      Dùng ít nhất 8 ký tự, gồm chữ cái và chữ số.
                    </Text>
                  )}
                </View>

                <Pressable
                  className="mt-7 h-[54px] flex-row items-center justify-center rounded-2xl bg-primary px-5"
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Tạo tài khoản"
                  accessibilityState={{ disabled: isSubmitting, busy: isSubmitting }}
                  style={({ pressed }) => ({
                    opacity: isSubmitting ? 0.58 : pressed ? 0.86 : 1,
                    transform: [
                      { scale: pressed && !isSubmitting ? 0.99 : 1 },
                    ],
                  })}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color={colors.text.inverse} />
                  ) : (
                    <>
                      <Text className="text-base font-bold text-white">
                        Tạo tài khoản
                      </Text>
                      <ArrowRight
                        size={20}
                        color={colors.text.inverse}
                        strokeWidth={2}
                        style={styles.buttonIcon}
                      />
                    </>
                  )}
                </Pressable>

                <Text className="mx-2 mt-4 text-center text-xs leading-5 text-text-secondary">
                  Khi tạo tài khoản, bạn đồng ý cung cấp thông tin chính xác và tuân thủ quy tắc an toàn của Borrow Hub.
                </Text>

                <View className="mb-2 mt-6 flex-row flex-wrap items-center justify-center">
                  <Text className="text-sm text-text-secondary">
                    Đã có tài khoản?{' '}
                  </Text>
                  <Pressable
                    onPress={() => router.replace('/auth/login')}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel="Quay lại đăng nhập"
                    style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}
                  >
                    <Text className="text-sm font-bold text-primary-dark">
                      Đăng nhập
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingTop: 14,
    paddingBottom: 20,
  },
  contentColumn: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  buttonIcon: {
    marginLeft: 10,
  },
});
