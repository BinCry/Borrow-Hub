import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, ChevronLeft, X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
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
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

const createAssetSchema = z.object({
  title: z.string().trim().min(5, 'Tiêu đề phải có ít nhất 5 ký tự').max(120),
  description: z.string().trim().min(20, 'Mô tả phải có ít nhất 20 ký tự').max(3000),
  pricePerDay: z.string().refine(
    (value) => Number.isInteger(Number(value)) && Number(value) > 0,
    'Giá thuê phải là số nguyên dương',
  ),
  estimatedValue: z.string().refine(
    (value) => Number.isInteger(Number(value)) && Number(value) > 0,
    'Giá trị phải là số nguyên dương',
  ),
  categoryId: z.string().min(1, 'Hãy chọn danh mục'),
  city: z.string().trim().min(2, 'Hãy nhập tỉnh/thành phố').max(100),
  district: z.string().trim().min(2, 'Hãy nhập quận/huyện').max(100),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN']),
});

type CreateAssetForm = z.infer<typeof createAssetSchema>;
type Category = {
  id: string;
  name: string;
  children?: Category[];
};
type UploadedImage = {
  url: string;
  fileKey: string;
};

const conditionOptions: { value: CreateAssetForm['condition']; label: string }[] = [
  { value: 'NEW', label: 'Mới' },
  { value: 'LIKE_NEW', label: 'Như mới' },
  { value: 'GOOD', label: 'Tốt' },
  { value: 'FAIR', label: 'Khá' },
  { value: 'WORN', label: 'Đã qua sử dụng' },
];

function flattenCategories(categories: Category[]): Category[] {
  return categories.flatMap((category) => [
    category,
    ...flattenCategories(category.children ?? []),
  ]);
}

function getErrorMessage(error: unknown) {
  if (error instanceof AxiosError) {
    const message = (error.response?.data as { message?: string | string[] } | undefined)
      ?.message;
    return Array.isArray(message) ? message.join('\n') : message;
  }
  return undefined;
}

function appendImage(formData: FormData, asset: ImagePicker.ImagePickerAsset) {
  formData.append(
    'file',
    {
      uri: asset.uri,
      name: asset.fileName ?? `asset-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob,
  );
}

export default function CreateListingScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedImages, setSelectedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => flattenCategories((await apiClient.get<Category[]>('/categories')).data),
  });
  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateAssetForm>({
    resolver: zodResolver(createAssetSchema),
    defaultValues: {
      title: '',
      description: '',
      pricePerDay: '',
      estimatedValue: '',
      categoryId: '',
      city: '',
      district: '',
      condition: 'GOOD',
    },
  });
  const createMutation = useMutation({
    mutationFn: async (data: CreateAssetForm) => {
      if (selectedImages.length === 0) {
        throw new Error('IMAGE_REQUIRED');
      }

      const uploadedImages = await Promise.all(
        selectedImages.map(async (asset) => {
          const formData = new FormData();
          appendImage(formData, asset);
          return (
            await apiClient.post<UploadedImage>('/assets/upload-image', formData, {
              headers: { 'Content-Type': 'multipart/form-data' },
              timeout: 30_000,
            })
          ).data;
        }),
      );

      return apiClient.post('/assets', {
        ...data,
        pricePerDay: Number(data.pricePerDay),
        estimatedValue: Number(data.estimatedValue),
        minimumDurationDays: 1,
        maximumDurationDays: 30,
        deliveryOptions: ['PICKUP'],
        images: uploadedImages.map((image, index) => ({
          ...image,
          sortOrder: index,
          isCover: index === 0,
        })),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['my-assets'] });
      void queryClient.invalidateQueries({ queryKey: ['assets'] });
      Alert.alert(
        'Đã gửi bài đăng',
        'Bài đăng đang chờ kiểm duyệt trước khi xuất hiện trên trang khám phá.',
      );
      router.back();
    },
    onError: (error) => {
      Alert.alert(
        'Không thể tạo bài đăng',
        error instanceof Error && error.message === 'IMAGE_REQUIRED'
          ? 'Hãy chọn ít nhất một ảnh tài sản.'
          : getErrorMessage(error) ?? 'Kiểm tra thông tin và thử lại.',
      );
    },
  });

  const pickImages = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - selectedImages.length),
      quality: 0.9,
    });

    if (!result.canceled) {
      setSelectedImages((current) => [...current, ...result.assets].slice(0, 5));
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
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
            Tạo bài đăng
          </Text>
          <View className="w-11" />
        </View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text className="mb-2 font-semibold text-text-primary">Hình ảnh tài sản</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
            {selectedImages.map((image, index) => (
              <View key={`${image.uri}-${index}`} className="relative mr-3">
                <Image
                  source={{ uri: image.uri }}
                  style={{ width: 112, height: 112, borderRadius: 16 }}
                  contentFit="cover"
                />
                <TouchableOpacity
                  accessibilityLabel="Xóa ảnh"
                  className="absolute -right-1 -top-1 h-8 w-8 items-center justify-center rounded-full bg-black/70"
                  onPress={() =>
                    setSelectedImages((current) =>
                      current.filter((_, itemIndex) => itemIndex !== index),
                    )
                  }
                >
                  <X size={16} color="white" />
                </TouchableOpacity>
              </View>
            ))}
            {selectedImages.length < 5 ? (
              <TouchableOpacity
                accessibilityLabel="Chọn ảnh tài sản"
                className="h-28 w-28 items-center justify-center rounded-2xl border-2 border-dashed border-primary/40 bg-primary-soft"
                onPress={() => void pickImages()}
              >
                <Camera size={28} color={colors.primary.DEFAULT} />
                <Text className="mt-2 text-xs font-bold text-primary">Thêm ảnh</Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>

          <FormInput
            control={control}
            name="title"
            label="Tiêu đề"
            placeholder="Ví dụ: Máy ảnh Sony A7 IV"
            error={errors.title?.message}
          />
          <FormInput
            control={control}
            name="description"
            label="Mô tả chi tiết"
            placeholder="Tình trạng, phụ kiện đi kèm và lưu ý khi sử dụng"
            error={errors.description?.message}
            multiline
          />

          <Text className="mb-2 font-semibold text-text-primary">Danh mục</Text>
          {categoriesQuery.isLoading ? (
            <ActivityIndicator className="mb-5" color={colors.primary.DEFAULT} />
          ) : categoriesQuery.isError ? (
            <TouchableOpacity
              className="mb-5 min-h-12 items-center justify-center rounded-xl border border-danger"
              onPress={() => void categoriesQuery.refetch()}
            >
              <Text className="font-semibold text-danger">Tải lại danh mục</Text>
            </TouchableOpacity>
          ) : (
            <Controller
              control={control}
              name="categoryId"
              render={({ field: { onChange, value } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-5">
                  {(categoriesQuery.data ?? []).map((category) => (
                    <TouchableOpacity
                      key={category.id}
                      className={`mr-2 min-h-11 justify-center rounded-full border px-4 ${
                        value === category.id
                          ? 'border-primary bg-primary'
                          : 'border-border bg-surface'
                      }`}
                      onPress={() => onChange(category.id)}
                    >
                      <Text
                        className={`font-semibold ${
                          value === category.id ? 'text-white' : 'text-text-primary'
                        }`}
                      >
                        {category.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            />
          )}
          {errors.categoryId ? (
            <Text className="-mt-3 mb-4 text-sm text-danger">{errors.categoryId.message}</Text>
          ) : null}

          <Text className="mb-2 font-semibold text-text-primary">Tình trạng</Text>
          <Controller
            control={control}
            name="condition"
            render={({ field: { onChange, value } }) => (
              <View className="mb-5 flex-row flex-wrap gap-2">
                {conditionOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    className={`min-h-11 justify-center rounded-full border px-4 ${
                      value === option.value
                        ? 'border-primary bg-primary-soft'
                        : 'border-border bg-surface'
                    }`}
                    onPress={() => onChange(option.value)}
                  >
                    <Text className="font-semibold text-text-primary">{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput
                control={control}
                name="pricePerDay"
                label="Giá/ngày (VND)"
                placeholder="150000"
                error={errors.pricePerDay?.message}
                keyboardType="number-pad"
              />
            </View>
            <View className="flex-1">
              <FormInput
                control={control}
                name="estimatedValue"
                label="Giá trị (VND)"
                placeholder="5000000"
                error={errors.estimatedValue?.message}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <FormInput
                control={control}
                name="city"
                label="Tỉnh/Thành phố"
                placeholder="Hồ Chí Minh"
                error={errors.city?.message}
              />
            </View>
            <View className="flex-1">
              <FormInput
                control={control}
                name="district"
                label="Quận/Huyện"
                placeholder="Quận 1"
                error={errors.district?.message}
              />
            </View>
          </View>

          <TouchableOpacity
            className={`mt-2 min-h-14 items-center justify-center rounded-xl bg-primary ${
              createMutation.isPending ? 'opacity-70' : ''
            }`}
            disabled={createMutation.isPending}
            onPress={handleSubmit((data) => createMutation.mutate(data))}
          >
            {createMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-lg font-bold text-white">Gửi duyệt bài đăng</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

type FormInputProps = {
  control: ReturnType<typeof useForm<CreateAssetForm>>['control'];
  name: keyof CreateAssetForm;
  label: string;
  placeholder: string;
  error?: string;
  multiline?: boolean;
  keyboardType?: 'default' | 'number-pad';
};

function FormInput({
  control,
  name,
  label,
  placeholder,
  error,
  multiline = false,
  keyboardType = 'default',
}: FormInputProps) {
  return (
    <View className="mb-5">
      <Text className="mb-2 font-semibold text-text-primary">{label}</Text>
      <Controller
        control={control}
        name={name}
        render={({ field: { onBlur, onChange, value } }) => (
          <TextInput
            className={`rounded-xl border bg-surface px-4 text-text-primary ${
              multiline ? 'min-h-28 py-3' : 'min-h-14'
            } ${error ? 'border-danger' : 'border-border'}`}
            value={value}
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder={placeholder}
            placeholderTextColor={colors.text.muted}
            multiline={multiline}
            textAlignVertical={multiline ? 'top' : 'center'}
            keyboardType={keyboardType}
          />
        )}
      />
      {error ? <Text className="mt-1 text-sm text-danger">{error}</Text> : null}
    </View>
  );
}
