import { colors } from '../theme/colors';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from '../types/domain';
import { MapPin, Star } from 'lucide-react-native';
import { Link } from 'expo-router';

interface AssetCardProps {
  asset: Asset;
}

export function AssetCard({ asset }: AssetCardProps) {
  const coverImage = asset.images?.find((img) => img.isCover)?.url || asset.images?.[0]?.url;

  return (
    <Link href={`/asset/${asset.id}`} asChild>
      <TouchableOpacity className="bg-surface rounded-2xl overflow-hidden mb-5 w-full shadow-sm border border-gray-100">
        {coverImage ? (
          <Image 
            source={{ uri: coverImage }} 
            style={{ width: '100%', height: 200 }} 
            contentFit="cover"
            transition={200}
            className="bg-gray-100"
          />
        ) : (
          <View className="w-full h-[200px] bg-gray-100 items-center justify-center">
            <Text className="text-text-secondary">Chưa có ảnh</Text>
          </View>
        )}
        
        <View className="p-4">
          <View className="flex-row justify-between items-start mb-1.5">
            <Text className="text-lg font-extrabold text-text-primary flex-1 mr-2 leading-tight" numberOfLines={1}>
              {asset.title}
            </Text>
            {asset.rating !== undefined && (
              <View className="flex-row items-center bg-primary-soft/50 px-2.5 py-1 rounded-full">
                <Star size={12} color={colors.primary.DEFAULT} fill={colors.primary.DEFAULT} />
                <Text className="text-primary font-bold text-[11px] ml-1">{asset.rating}</Text>
              </View>
            )}
          </View>

          <Text className="text-primary font-bold text-[17px] mb-3">
            {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)}<Text className="text-xs text-text-secondary font-medium">/ngày</Text>
          </Text>

          <View className="flex-row items-center">
            <View className="w-5 h-5 rounded-full bg-gray-50 items-center justify-center mr-1.5">
              <MapPin size={12} color="#6B7280" />
            </View>
            <Text className="text-text-secondary text-[13px] font-medium" numberOfLines={1}>
              {asset.location?.district}, {asset.location?.city}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Link>
  );
}
