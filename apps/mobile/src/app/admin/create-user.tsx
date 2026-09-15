import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, ShieldCheck } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AdminRole,
  AdminService,
  CreateInternalUserPayload,
} from '../../services/admin/admin.service';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';
import type { User } from '../../types/domain';

const createStaffSchema = z.object({
  fullName: z.string().trim().min(2, 'Tên phải có ít nhất 2 ký tự'),
  email: z.string().trim().toLowerCase().email('Email không hợp lệ'),
  phone: z.string().trim().regex(/^(?:\+84|0)\d{9}$/, 'Số điện thoại không hợp lệ'),
  password: z.string().min(8, 'Mật khẩu phải có ít nhất 8 ký tự'),
  role: z.enum(['ADMIN', 'MODERATOR', 'CUSTOMER_SUPPORT', 'DISPUTE_OFFICER']),
});

type CreateStaffForm = z.infer<typeof createStaffSchema>;

const roleOptions: { role: CreateStaffForm['role']; label: string; description: string }[] = [
  {
    role: 'ADMIN',
    label: 'Admin',
    description: 'Quản lý người dùng, KYC, listing và cấu hình vận hành.',
  },
  {
    role: 'MODERATOR',
    label: 'Kiểm duyệt',
    description: 'Duyệt nội dung, listing và đánh giá.',
  },
  {
    role: 'CUSTOMER_SUPPORT',
    label: 'CSKH',
    description: 'Hỗ trợ người dùng và xử lý ticket.',
  },
  {
    role: 'DISPUTE_OFFICER',
    label: 'Tranh chấp',
    description: 'Theo dõi hồ sơ tranh chấp và bằng chứng.',
  },
];

function isSuperAdmin(user?: User) {
  return user?.roles?.includes('SUPER_ADMIN') ?? false;
}

export default function CreateInternalUserScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateStaffForm>({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: 'ADMIN',
    },
  });
  const selectedRole = useWatch({ control, name: 'role' });
  const createMutation = useMutation({
    mutationFn: async (data: CreateStaffForm) => {
      const payload: CreateInternalUserPayload = {
        fullName: data.fullName.trim(),
        email: data.email.trim().toLowerCase(),
        phone: data.phone.trim(),
        password: data.password,
        roles: [data.role as AdminRole],
      };
      return AdminService.createInternalUser(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
      Alert.alert('Đã tạo nhân sự', 'Tài khoản nội bộ đã sẵn sàng đăng nhập.');
      router.back();
    },
    onError: () => {
      Alert.alert(
        'Không thể tạo nhân sự',
        'Email hoặc số điện thoại có thể đã tồn tại. Kiểm tra lại thông tin rồi thử lại.',
      );
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
          <TouchableOpacity
            accessibilityLabel="Quay lại"
            className="min-h-11 min-w-11 items-center justify-center rounded-full"
            onPress={() => router.back()}
          >
            <ChevronLeft size={28} color={colors.text.primary} />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-lg font-bold text-text-primary">
            Tạo nhân sự
          </Text>
          <View className="w-11" />
        </View>

        {meQuery.isLoading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
          </View>
        ) : !isSuperAdmin(meQuery.data) ? (
          <EmptyState
            title="Chỉ SUPER_ADMIN mới được tạo nhân sự"
            description="Tài khoản ADMIN vẫn xem được bảng quản trị nhưng không được cấp tài khoản nội bộ mới."
            buttonText="Quay lại"
            onPress={() => router.back()}
          />
        ) : (
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
          >
          <View className="mb-6 items-center">
            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
              <ShieldCheck size={40} color={colors.primary.DEFAULT} />
            </View>
            <Text className="mt-4 text-center text-xl font-extrabold text-text-primary">
              Cấp quyền vận hành RentLoop
            </Text>
            <Text className="mt-2 text-center leading-6 text-text-secondary">
              Tài khoản tạo ở đây được xác thực sẵn và chỉ dùng cho đội ngũ nội bộ.
            </Text>
          </View>

          <FormInput
            control={control}
            name="fullName"
            label="Họ tên"
            placeholder="Nguyễn Văn A"
            error={errors.fullName?.message}
          />
          <FormInput
            control={control}
            name="email"
            label="Email"
            placeholder="staff@rentloop.local"
            error={errors.email?.message}
            keyboardType="email-address"
          />
          <FormInput
            control={control}
            name="phone"
            label="Số điện thoại"
            placeholder="0900000098"
            error={errors.phone?.message}
            keyboardType="phone-pad"
          />
          <FormInput
            control={control}
            name="password"
            label="Mật khẩu tạm"
            placeholder="Ít nhất 8 ký tự"
            error={errors.password?.message}
            secureTextEntry
          />

          <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
            Vai trò
          </Text>
          <Controller
            control={control}
            name="role"
            render={({ field: { onChange } }) => (
              <View className="mb-6">
                {roleOptions.map((option) => {
                  const selected = option.role === selectedRole;
                  return (
                    <TouchableOpacity
                      key={option.role}
                      className={`mb-3 rounded-2xl border p-4 ${
                        selected ? 'border-primary bg-primary-soft' : 'border-border bg-surface'
                      }`}
                      onPress={() => onChange(option.role)}
                    >
                      <Text className="font-extrabold text-text-primary">{option.label}</Text>
                      <Text className="mt-1 leading-5 text-text-secondary">
                        {option.description}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          />

          <TouchableOpacity
            className={`min-h-14 items-center justify-center rounded-xl bg-primary ${
              createMutation.isPending ? 'opacity-70' : ''
            }`}
            disabled={createMutation.isPending}
            onPress={handleSubmit((data) => createMutation.mutate(data))}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-bold text-white">Tạo tài khoản</Text>
            )}
          </TouchableOpacity>
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormInputProps = {
  control: ReturnType<typeof useForm<CreateStaffForm>>['control'];
  name: keyof CreateStaffForm;
  label: string;
  placeholder: string;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  secureTextEntry?: boolean;
};

function FormInput({
  control,
  name,
  label,
  placeholder,
  error,
  keyboardType = 'default',
  secureTextEntry = false,
}: FormInputProps) {
  return (
    <View className="mb-5">
      <Text className="mb-2 font-semibold text-text-primary">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            className={`min-h-14 rounded-xl border bg-surface px-4 text-text-primary ${
              error ? 'border-danger' : 'border-border'
            }`}
            autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
            keyboardType={keyboardType}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            secureTextEntry={secureTextEntry}
            value={String(value ?? '')}
          />
        )}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
