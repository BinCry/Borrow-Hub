import { colors } from '../theme/colors';
import { View, Text, TouchableOpacity } from 'react-native';
import { Image } from 'expo-image';
import { Asset } from '../types/domain';
import { MapPin, Star, User, ShieldCheck } from 'lucide-react-native';
import { Link, useRouter } from 'expo-router';

interface AssetCardProps {
  asset: Asset;
  adminPreview?: boolean;
}

export function AssetCard({ asset, adminPreview = false }: AssetCardProps) {
  const router = useRouter();
  const coverImage = asset.images?.find((img) => img.isCover)?.url || asset.images?.[0]?.url;
  const owner = asset.owner;
  const ownerName = owner?.fullName || 'Người đăng';
  const detailHref = adminPreview
    ? { pathname: '/asset/[id]', params: { id: asset.id, admin: '1' } }
    : `/asset/${asset.id}`;

  return (
    <View className="mb-4 w-full overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel={`Xem hồ sơ ${ownerName}`}
        className="flex-row items-center px-4 py-3"
        onPress={() => router.push({
          pathname: '/profile/[id]',
          params: {
            id: asset.ownerId,
            name: ownerName,
            avatar: owner?.avatarUrl ?? '',
            trustScore: String(owner?.trustScore ?? 0),
          },
        })}
      >
        <View className="mr-3 h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-primary-soft">
          {owner?.avatarUrl ? (
            <Image source={{ uri: owner.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <User size={20} color={colors.primary.DEFAULT} />
          )}
        </View>
        <View className="flex-1">
          <Text className="font-bold text-text-primary" numberOfLines={1}>{ownerName}</Text>
          <View className="mt-0.5 flex-row items-center">
            <ShieldCheck size={13} color={colors.success} />
            <Text className="ml-1 text-xs text-text-secondary">Người cho thuê</Text>
          </View>
        </View>
        {asset.rating > 0 ? (
          <View className="flex-row items-center rounded-full bg-primary-soft px-2 py-1">
            <Star size={12} color={colors.primary.DEFAULT} fill={colors.primary.DEFAULT} />
            <Text className="ml-1 text-xs font-bold text-primary">{asset.rating.toFixed(1)}</Text>
          </View>
        ) : null}
      </TouchableOpacity>

      <Link href={detailHref as never} asChild>
        <TouchableOpacity accessibilityRole="button">
          {coverImage ? (
            <Image source={{ uri: coverImage }} style={{ width: '100%', aspectRatio: 1.55 }} contentFit="cover" transition={200} className="bg-gray-100" />
          ) : (
            <View className="w-full items-center justify-center bg-gray-100" style={{ aspectRatio: 1.55 }}>
              <Text className="text-text-secondary">Chưa có ảnh</Text>
            </View>
          )}

          <View className="px-4 pb-4 pt-3">
            <Text className="text-lg font-extrabold leading-tight text-text-primary" numberOfLines={2}>{asset.title}</Text>
            <Text className="mt-1 text-[17px] font-bold text-primary">
              {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(asset.pricePerDay)}
              <Text className="text-xs font-medium text-text-secondary">/ngày</Text>
            </Text>
            <View className="mt-2 flex-row items-center">
              <MapPin size={14} color="#6B7280" />
              <Text className="ml-1.5 flex-1 text-[13px] font-medium text-text-secondary" numberOfLines={1}>
                {asset.location?.district}, {asset.location?.city}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      </Link>
    </View>
  );
}
