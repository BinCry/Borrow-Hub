import { colors } from '../theme/colors';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Asset } from '../types/api';
import { MapPin, Star } from 'lucide-react-native';
import { Link } from 'expo-router';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const coverImage = asset.images?.find((img) => img.isCover)?.url || asset.images?.[0]?.url;

  return (
    <Link href={`/asset/${asset.id}`} asChild>
      <TouchableOpacity className="bg-surface rounded-xl overflow-hidden border border-border mb-4 w-full">
        {coverImage ? (
          <Image source={{ uri: coverImage }} className="w-full h-48 bg-gray-200" resizeMode="cover" />
        ) : (
          <View className="w-full h-48 bg-gray-200 items-center justify-center">
            <Text className="text-text-secondary">Chưa có ảnh</Text>
          </View>
        )}
        
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-1">
            <Text className="text-lg font-bold text-text-primary flex-1 mr-2" numberOfLines={1}>
              {asset.title}
            </Text>
            {asset.rating !== undefined && (
              <View className="flex-row items-center bg-primary-soft px-2 py-1 rounded-full">
                <Star size={12} color={colors.primary.DEFAULT} fill={colors.primary.DEFAULT} />
                <Text className="text-primary font-semibold text-xs ml-1">{asset.rating}</Text>
              </View>
            )}
          </View>

          <Text className="text-primary font-semibold text-lg mb-2">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)}<Text className="text-sm text-text-secondary font-normal">/ngày</Text>
          </Text>

          <View className="flex-row items-center">
            <MapPin size={14} color="#6B7280" />
            <Text className="text-text-secondary text-sm ml-1" numberOfLines={1}>
              {asset.district}, {asset.city}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}
