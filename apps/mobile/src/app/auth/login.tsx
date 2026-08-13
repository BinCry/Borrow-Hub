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
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
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
      Alert.alert('Login Failed', error.response?.data?.message || 'Something went wrong');
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
          <Text className="text-3xl font-bold text-primary">Welcome Back</Text>
          <Text className="text-text-secondary mt-2">Login to continue</Text>
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
                placeholder="Enter your email"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            )}
          />
          {errors.email && <Text className="text-danger mt-1 text-sm">{errors.email.message}</Text>}
        </View>

        <View className="mb-6">
          <Text className="text-text-primary mb-2 font-medium">Password</Text>
          <Controller
            control={control}
            name="password"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Enter your password"
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
          <Text className="text-white font-semibold text-lg">{loading ? 'Logging in...' : 'Login'}</Text>
        </TouchableOpacity>

        <View className="flex-row justify-center mt-6">
          <Text className="text-text-secondary">Don't have an account? </Text>
          <Link href="/auth/register" asChild>
            <TouchableOpacity>
              <Text className="text-primary font-semibold">Sign Up</Text>
            </TouchableOpacity>
          </Link>
        </View>
        
        {/* Bypass login for dev/browsing */}
        <View className="flex-row justify-center mt-6">
          <Link href="/(tabs)" asChild>
            <TouchableOpacity>
              <Text className="text-text-secondary underline">Continue as Guest</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
