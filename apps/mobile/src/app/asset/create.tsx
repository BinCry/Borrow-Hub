import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { ChevronLeft } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createAssetSchema = z.object({
  title: z.string().min(5, 'Tiêu đề phải dài ít nhất 5 ký tự'),
  description: z.string().min(10, 'Mô tả phải dài ít nhất 10 ký tự'),
  pricePerDay: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Phải là số hợp lệ'),
  categoryId: z.string().min(1, 'Danh mục là bắt buộc'),
  city: z.string().min(2, 'Tỉnh/Thành phố là bắt buộc'),
  district: z.string().min(2, 'Quận/Huyện là bắt buộc'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN']),
  estimatedValue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Phải là số hợp lệ'),
});

type CreateAssetForm = z.infer<typeof createAssetSchema>;

export default function CreateListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const { control, handleSubmit, formState: { errors } } = useForm<CreateAssetForm>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      condition: 'GOOD',
      categoryId: 'default-category', // Mock default until category selection UI is built
    }
  });

  const { mutate: createListing, isPending } = useMutation({
    mutationFn: async (data: CreateAssetForm) => {
      // In a real app we would fetch categories first and have a picker. 
      // Also we need to fetch a valid categoryId if 'default-category' fails in DB.
      // We will parse number fields before sending.
      const payload = {
        ...data,
        pricePerDay: Number(data.pricePerDay),
        estimatedValue: Number(data.estimatedValue),
        minimumDurationDays: 1,
        maximumDurationDays: 30,
      };
      return apiClient.post('/assets', payload);
    },
    onSuccess: () => {
      Alert.alert('Thành công', 'Đã tạo bài đăng thành công');
      queryClient.invalidateQueries({ queryKey: ['my-assets'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Lỗi', error.response?.data?.message || 'Không thể tạo bài đăng');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
            <ChevronLeft size={28} color="#1F2937" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-text-primary">Tạo bài đăng</Text>
          <View className="w-10" />
        </View>

        <ScrollView className="flex-1 px-5 py-4" contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          
          <View className="mb-4">
            <Text className="text-text-primary mb-2 font-medium">Tiêu đề</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Bạn muốn cho thuê món đồ gì?"
              />
            )}
          />
          {errors.title && <Text className="text-danger mt-1 text-sm">{errors.title.message}</Text>}
        </View>

        <View className="mb-4">
          <Text className="text-text-primary mb-2 font-medium">Mô tả</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Mô tả chi tiết về món đồ của bạn"
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            )}
          />
          {errors.description && <Text className="text-danger mt-1 text-sm">{errors.description.message}</Text>}
        </View>

        <View className="flex-row mb-4">
          <View className="flex-1 mr-2">
            <Text className="text-text-primary mb-2 font-medium">Giá thuê 1 ngày (VND)</Text>
            <Controller
              control={control}
              name="pricePerDay"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="VD: 50000"
                  keyboardType="numeric"
                />
              )}
            />
            {errors.pricePerDay && <Text className="text-danger mt-1 text-sm">{errors.pricePerDay.message}</Text>}
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-text-primary mb-2 font-medium">Giá trị ước tính (VND)</Text>
            <Controller
              control={control}
              name="estimatedValue"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="VD: 1000000"
                  keyboardType="numeric"
                />
              )}
            />
            {errors.estimatedValue && <Text className="text-danger mt-1 text-sm">{errors.estimatedValue.message}</Text>}
          </View>
        </View>

        <View className="flex-row mb-6">
          <View className="flex-1 mr-2">
            <Text className="text-text-primary mb-2 font-medium">Tỉnh/Thành phố</Text>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="VD: Hồ Chí Minh"
                />
              )}
            />
            {errors.city && <Text className="text-danger mt-1 text-sm">{errors.city.message}</Text>}
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-text-primary mb-2 font-medium">Quận/Huyện</Text>
            <Controller
              control={control}
              name="district"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="VD: Quận 1"
                />
              )}
            />
            {errors.district && <Text className="text-danger mt-1 text-sm">{errors.district.message}</Text>}
          </View>
        </View>

        <TouchableOpacity 
          className={`bg-primary rounded-xl py-4 items-center shadow-sm mb-10 ${isPending ? 'opacity-70' : ''}`}
          onPress={handleSubmit((data) => createListing(data))}
          disabled={isPending}
        >
          {isPending ? (
             <ActivityIndicator color="white" />
          ) : (
            <Text className="text-white font-bold text-lg">Đăng cho thuê</Text>
          )}
        </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
