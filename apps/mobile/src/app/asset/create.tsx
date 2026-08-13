import { View, Text, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { apiClient } from '../../services/api/client';
import { ChevronLeft } from 'lucide-react-native';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const createAssetSchema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  pricePerDay: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a valid positive number'),
  categoryId: z.string().min(1, 'Category is required'),
  city: z.string().min(2, 'City is required'),
  district: z.string().min(2, 'District is required'),
  condition: z.enum(['NEW', 'LIKE_NEW', 'GOOD', 'FAIR', 'WORN']),
  estimatedValue: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Must be a valid positive number'),
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
      Alert.alert('Success', 'Listing created successfully');
      queryClient.invalidateQueries({ queryKey: ['my-assets'] });
      router.back();
    },
    onError: (error: any) => {
      Alert.alert('Creation Failed', error.response?.data?.message || 'Could not create listing');
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Create Listing</Text>
        <View className="w-10" />
      </View>

      <ScrollView className="flex-1 px-5 py-4">
        
        <View className="mb-4">
          <Text className="text-text-primary mb-2 font-medium">Title</Text>
          <Controller
            control={control}
            name="title"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="What are you renting out?"
              />
            )}
          />
          {errors.title && <Text className="text-danger mt-1 text-sm">{errors.title.message}</Text>}
        </View>

        <View className="mb-4">
          <Text className="text-text-primary mb-2 font-medium">Description</Text>
          <Controller
            control={control}
            name="description"
            render={({ field: { onChange, onBlur, value } }) => (
              <TextInput
                className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                onBlur={onBlur}
                onChangeText={onChange}
                value={value}
                placeholder="Describe your item in detail"
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
            <Text className="text-text-primary mb-2 font-medium">Price per day (VND)</Text>
            <Controller
              control={control}
              name="pricePerDay"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g. 50000"
                  keyboardType="numeric"
                />
              )}
            />
            {errors.pricePerDay && <Text className="text-danger mt-1 text-sm">{errors.pricePerDay.message}</Text>}
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-text-primary mb-2 font-medium">Est. Value (VND)</Text>
            <Controller
              control={control}
              name="estimatedValue"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g. 1000000"
                  keyboardType="numeric"
                />
              )}
            />
            {errors.estimatedValue && <Text className="text-danger mt-1 text-sm">{errors.estimatedValue.message}</Text>}
          </View>
        </View>

        <View className="flex-row mb-6">
          <View className="flex-1 mr-2">
            <Text className="text-text-primary mb-2 font-medium">City</Text>
            <Controller
              control={control}
              name="city"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g. Ho Chi Minh"
                />
              )}
            />
            {errors.city && <Text className="text-danger mt-1 text-sm">{errors.city.message}</Text>}
          </View>
          <View className="flex-1 ml-2">
            <Text className="text-text-primary mb-2 font-medium">District</Text>
            <Controller
              control={control}
              name="district"
              render={({ field: { onChange, onBlur, value } }) => (
                <TextInput
                  className="bg-surface border border-border rounded-lg px-4 py-3 text-text-primary"
                  onBlur={onBlur}
                  onChangeText={onChange}
                  value={value}
                  placeholder="e.g. District 1"
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
            <Text className="text-white font-bold text-lg">Create Listing</Text>
          )}
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}
