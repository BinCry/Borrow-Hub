import { View, Text, ScrollView, Image, ActivityIndicator, TouchableOpacity, FlatList, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../../services/api/client';
import { Asset } from '../../types/api';
import { ChevronLeft, MapPin, Star, ShieldCheck, Heart } from 'lucide-react-native';

const { width } = Dimensions.get('window');

export default function AssetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const { data: asset, isLoading, isError } = useQuery({
    queryKey: ['asset', id],
    queryFn: async () => {
      const response = await apiClient.get<Asset>(`/assets/${id}`);
      return response.data;
    },
  });

  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#4F7C6B" />
      </SafeAreaView>
    );
  }

  if (isError || !asset) {
    return (
      <SafeAreaView className="flex-1 bg-background items-center justify-center">
        <Text className="text-danger">Failed to load asset details.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-primary px-4 py-2 rounded-lg">
          <Text className="text-white">Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center justify-between px-4 py-3 bg-surface z-10 border-b border-border">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
          <ChevronLeft size={28} color="#1F2937" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary" numberOfLines={1}>
          Details
        </Text>
        <TouchableOpacity className="p-2 -mr-2">
          <Heart size={24} color="#6B7280" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Image Gallery */}
        <View className="bg-gray-200">
          {asset.images && asset.images.length > 0 ? (
            <FlatList
              data={asset.images}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <Image
                  source={{ uri: item.url }}
                  style={{ width, height: width * 0.75 }}
                  resizeMode="cover"
                />
              )}
            />
          ) : (
            <View style={{ width, height: width * 0.75 }} className="items-center justify-center">
              <Text className="text-text-secondary">No Images</Text>
            </View>
          )}
        </View>

        <View className="p-5">
          {/* Header Info */}
          <View className="mb-4">
            <Text className="text-2xl font-bold text-text-primary mb-1">{asset.title}</Text>
            <View className="flex-row items-center">
              <Text className="text-xl font-bold text-primary mr-2">
                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)}
                <Text className="text-base text-text-secondary font-normal">/day</Text>
              </Text>
              {asset.rating !== undefined && (
                <View className="flex-row items-center bg-primary-soft px-2 py-1 rounded-full">
                  <Star size={14} color="#4F7C6B" fill="#4F7C6B" />
                  <Text className="text-primary font-bold text-sm ml-1">{asset.rating}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Location */}
          <View className="flex-row items-center mb-6 pb-6 border-b border-border">
            <View className="bg-gray-100 p-2 rounded-full mr-3">
              <MapPin size={20} color="#4F7C6B" />
            </View>
            <View>
              <Text className="text-text-secondary text-xs">Location</Text>
              <Text className="text-text-primary font-medium">{asset.district}, {asset.city}</Text>
            </View>
          </View>

          {/* Owner Profile */}
          <View className="flex-row items-center mb-6 pb-6 border-b border-border">
            <View className="w-12 h-12 rounded-full bg-primary-soft items-center justify-center mr-3 overflow-hidden">
              {asset.owner?.avatarUrl ? (
                <Image source={{ uri: asset.owner.avatarUrl }} className="w-full h-full" />
              ) : (
                <User size={24} color="#4F7C6B" />
              )}
            </View>
            <View className="flex-1">
              <Text className="text-text-primary font-bold">{asset.owner?.fullName || 'Owner'}</Text>
              <View className="flex-row items-center mt-1">
                <ShieldCheck size={14} color="#2F855A" />
                <Text className="text-success text-xs font-semibold ml-1">
                  Trust Score: {asset.owner?.trustScore || 0}
                </Text>
              </View>
            </View>
          </View>

          {/* Description */}
          <View className="mb-6">
            <Text className="text-lg font-bold text-text-primary mb-2">Description</Text>
            <Text className="text-text-secondary leading-6">{asset.description}</Text>
          </View>

        </View>
      </ScrollView>

      {/* Bottom CTA */}
      <View className="px-5 py-4 bg-surface border-t border-border">
        <TouchableOpacity 
          className="bg-primary rounded-xl py-4 items-center shadow-sm"
          onPress={() => router.push(`/asset/${id}/book`)}
        >
          <Text className="text-white font-bold text-lg">Request to Rent</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Just importing User icon for the fallback
import { User } from 'lucide-react-native';
