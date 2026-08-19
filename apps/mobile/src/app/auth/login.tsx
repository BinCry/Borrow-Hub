import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
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

const loginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, 'Vui lòng nhập email hoặc số điện thoại')
    .refine(
      (value) =>
        z.email().safeParse(value).success ||
        vietnamesePhonePattern.test(value.replace(/\s/g, '')),
      'Email hoặc số điện thoại chưa đúng định dạng',
    ),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
});

type LoginForm = z.infer<typeof loginSchema>;

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

export default function LoginScreen() {
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
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const identifier = data.identifier.includes('@')
        ? data.identifier.trim().toLowerCase()
        : data.identifier.replace(/\s/g, '');
      const response = await apiClient.post<AuthResponse>('/auth/login', {
        identifier,
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
          'Không thể đăng nhập. Kiểm tra kết nối và thử lại.',
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
          'rgba(247,248,245,0.08)',
          'rgba(247,248,245,0.52)',
          'rgba(247,248,245,0.97)',
        ]}
        locations={[0, 0.48, 0.82]}
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
              <View
                className="flex-row items-center self-start"
                accessible
                accessibilityRole="header"
                accessibilityLabel="Borrow Hub"
              >
                <View className="h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                  <Image
                    source={require('../../../assets/images/borrow-hub-mark-v2.png')}
                    style={{ width: 31, height: 31 }}
                    contentFit="contain"
                  />
                </View>
                <View className="ml-3">
                  <Text className="text-[11px] font-semibold uppercase tracking-[2.4px] text-primary-dark">
                    Borrow Hub
                  </Text>
                  <Text className="mt-0.5 text-sm text-text-secondary">
                    Thuê đúng món, dùng đúng lúc
                  </Text>
                </View>
              </View>

              <View className="mt-20">
                <Text className="text-[34px] font-bold leading-[40px] tracking-[-0.8px] text-text-primary">
                  Chào mừng trở lại
                </Text>
                <Text className="mt-3 max-w-[360px] text-base leading-6 text-text-secondary">
                  Đăng nhập để tiếp tục quản lý tài sản, lịch thuê và các cuộc trò chuyện của bạn.
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
                    Email hoặc số điện thoại
                  </Text>
                  <Controller
                    control={control}
                    name="identifier"
                    render={({ field: { onBlur, onChange, value } }) => (
                      <View
                        className={
                          'h-[54px] flex-row items-center rounded-2xl border bg-white/70 px-4 ' +
                          (errors.identifier ? 'border-danger/60' : 'border-white')
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
                          placeholder="ban@example.com hoặc 09..."
                          placeholderTextColor={colors.text.muted}
                          keyboardType="email-address"
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="username"
                          textContentType="username"
                          importantForAutofill="yes"
                          returnKeyType="next"
                          selectionColor={colors.primary.DEFAULT}
                          accessibilityLabel="Email hoặc số điện thoại"
                        />
                      </View>
                    )}
                  />
                  {errors.identifier ? (
                    <Text
                      className="mt-2 text-sm leading-5 text-danger"
                      accessibilityRole="alert"
                    >
                      {errors.identifier.message}
                    </Text>
                  ) : null}
                </View>

                <View className="mt-5">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-text-primary">
                      Mật khẩu
                    </Text>
                    <Pressable
                      onPress={() => router.push('/auth/forgot-password')}
                      hitSlop={8}
                      accessibilityRole="link"
                      accessibilityLabel="Quên mật khẩu"
                      style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}
                    >
                      <Text className="text-sm font-semibold text-primary-dark">
                        Quên mật khẩu?
                      </Text>
                    </Pressable>
                  </View>
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
                          placeholder="Nhập mật khẩu"
                          placeholderTextColor={colors.text.muted}
                          secureTextEntry={!isPasswordVisible}
                          autoCapitalize="none"
                          autoCorrect={false}
                          autoComplete="current-password"
                          textContentType="password"
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
                  ) : null}
                </View>

                <Pressable
                  className="mt-7 h-[54px] flex-row items-center justify-center rounded-2xl bg-primary px-5"
                  onPress={handleSubmit(onSubmit)}
                  disabled={isSubmitting}
                  accessibilityRole="button"
                  accessibilityLabel="Đăng nhập"
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
                        Đăng nhập
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

                <View className="mt-6 flex-row flex-wrap items-center justify-center">
                  <Text className="text-sm text-text-secondary">
                    Chưa có tài khoản?{' '}
                  </Text>
                  <Pressable
                    onPress={() => router.push('/auth/register')}
                    hitSlop={8}
                    accessibilityRole="link"
                    accessibilityLabel="Tạo tài khoản mới"
                    style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}
                  >
                    <Text className="text-sm font-bold text-primary-dark">
                      Tạo tài khoản
                    </Text>
                  </Pressable>
                </View>

                <View className="my-6 flex-row items-center">
                  <View className="h-px flex-1 bg-text-muted/30" />
                  <Text className="mx-4 text-xs font-medium text-text-secondary">
                    hoặc
                  </Text>
                  <View className="h-px flex-1 bg-text-muted/30" />
                </View>

                <Pressable
                  className="h-12 items-center justify-center rounded-2xl border border-primary/25 bg-white/45"
                  onPress={() => router.replace('/(tabs)')}
                  accessibilityRole="button"
                  accessibilityLabel="Tiếp tục khám phá không cần đăng nhập"
                  style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}
                >
                  <Text className="text-sm font-semibold text-primary-dark">
                    Khám phá trước, đăng nhập sau
                  </Text>
                </Pressable>
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
    paddingTop: 18,
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
