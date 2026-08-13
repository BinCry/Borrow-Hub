import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Link, useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { useAuthStore } from '../../store/authStore';
import { useState } from 'react';

const registerSchema = z.object({
  fullName: z.string().min(2, 'Name is too short'),
  email: z.string().email('Invalid email format'),
  phone: z.string().min(10, 'Invalid phone number'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterScreen() {
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [loading, setLoading] = useState(false);

  const { control, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      const response = await apiClient.post('/auth/register', data);
      const token = response.data.accessToken;
      setAuth(token);
      router.replace('/(tabs)');
    } catch (error: any) {
      Alert.alert('Registration Failed', error.response?.data?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView contentContainerClassName="flex-grow justify-center px-6 py-6">
          <View className="mb-8">
            <Text className="text-3xl font-bold text-primary">Create Account</Text>
            <Text className="text-text-secondary mt-2">Join Borrow Hub today</Text>
          </View>

          <View className="mb-4">
            <Text className="text-text-primary mb-2 font-medium">Full Name</Text>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter your full name"
                />
              )}
            />
            {errors.fullName && <Text className="text-danger mt-1 text-sm">{errors.fullName.message}</Text>}
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
          
          <View className="mb-4">
            <Text className="text-text-primary mb-2 font-medium">Phone</Text>
            <Controller
              control={control}
              name="phone"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="Enter your phone number"
                  keyboardType="phone-pad"
                />
              )}
            />
            {errors.phone && <Text className="text-danger mt-1 text-sm">{errors.phone.message}</Text>}
          </View>

          <View className="mb-8">
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
                  placeholder="Create a password"
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
            <Text className="text-white font-semibold text-lg">{loading ? 'Signing up...' : 'Sign Up'}</Text>
          </TouchableOpacity>

          <View className="flex-row justify-center mt-6">
            <Text className="text-text-secondary">Already have an account? </Text>
            <Link href="/auth/login" asChild>
              <TouchableOpacity>
                <Text className="text-primary font-semibold">Login</Text>
              </TouchableOpacity>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
