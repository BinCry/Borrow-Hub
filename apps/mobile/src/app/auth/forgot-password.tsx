import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Mail,
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
import { colors } from '../../theme/colors';

const forgotPasswordSchema = z.object({
  email: z.email('Email chưa đúng định dạng'),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

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

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const horizontalPadding = width < 380 ? 20 : 28;

  const {
    control,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await apiClient.post('/auth/forgot-password', {
        email: data.email.trim().toLowerCase(),
      });
      setIsSuccess(true);
    } catch (error: unknown) {
      setSubmitError(
        getApiErrorMessage(
          error,
          'Không thể gửi yêu cầu lúc này. Kiểm tra kết nối và thử lại.',
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
          'rgba(247,248,245,0.05)',
          'rgba(247,248,245,0.58)',
          'rgba(247,248,245,0.98)',
        ]}
        locations={[0, 0.46, 0.78]}
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

              {isSuccess ? (
                <View className="mt-28">
                  <View className="h-16 w-16 items-center justify-center rounded-[22px] border border-white bg-white/65">
                    <CheckCircle2
                      size={32}
                      color={colors.primary.dark}
                      strokeWidth={1.8}
                    />
                  </View>
                  <Text className="mt-7 text-[34px] font-bold leading-[40px] tracking-[-0.8px] text-text-primary">
                    Yêu cầu đã được ghi nhận
                  </Text>
                  <Text className="mt-3 max-w-[390px] text-base leading-6 text-text-secondary">
                    Nếu {getValues('email')} tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu sẽ được gửi. Liên kết chỉ có hiệu lực trong thời gian ngắn.
                  </Text>

                  <Pressable
                    className="mt-8 h-[54px] flex-row items-center justify-center rounded-2xl bg-primary px-5"
                    onPress={() => router.replace('/auth/login')}
                    accessibilityRole="button"
                    accessibilityLabel="Quay lại đăng nhập"
                    style={({ pressed }) => ({
                      opacity: pressed ? 0.86 : 1,
                      transform: [{ scale: pressed ? 0.99 : 1 }],
                    })}
                  >
                    <Text className="text-base font-bold text-white">
                      Quay lại đăng nhập
                    </Text>
                    <ArrowRight
                      size={20}
                      color={colors.text.inverse}
                      strokeWidth={2}
                      style={styles.buttonIcon}
                    />
                  </Pressable>
                </View>
              ) : (
                <View className="mt-24">
                  <Text className="text-[34px] font-bold leading-[40px] tracking-[-0.8px] text-text-primary">
                    Khôi phục mật khẩu
                  </Text>
                  <Text className="mt-3 max-w-[380px] text-base leading-6 text-text-secondary">
                    Nhập email đã đăng ký. Chúng tôi sẽ tạo một liên kết đặt lại mật khẩu có thời hạn.
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

                  <View className="mt-8">
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
                            returnKeyType="send"
                            onSubmitEditing={handleSubmit(onSubmit)}
                            selectionColor={colors.primary.DEFAULT}
                            accessibilityLabel="Email đã đăng ký"
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

                  <Pressable
                    className="mt-7 h-[54px] flex-row items-center justify-center rounded-2xl bg-primary px-5"
                    onPress={handleSubmit(onSubmit)}
                    disabled={isSubmitting}
                    accessibilityRole="button"
                    accessibilityLabel="Gửi yêu cầu khôi phục mật khẩu"
                    accessibilityState={{
                      disabled: isSubmitting,
                      busy: isSubmitting,
                    }}
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
                          Gửi yêu cầu
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

                  <Pressable
                    className="mt-5 h-12 items-center justify-center"
                    onPress={() => router.replace('/auth/login')}
                    accessibilityRole="link"
                    accessibilityLabel="Quay lại đăng nhập"
                    style={({ pressed }) => ({ opacity: pressed ? 0.62 : 1 })}
                  >
                    <Text className="text-sm font-bold text-primary-dark">
                      Tôi nhớ mật khẩu rồi
                    </Text>
                  </Pressable>
                </View>
              )}
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
