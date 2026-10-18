import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { User } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';
import { apiClient } from '../services/api/client';
import { colors } from '../theme/colors';

export function UserAvatar({ userId, avatarUrl, size = 40 }: {
  userId?: string;
  avatarUrl?: string | null;
  size?: number;
}) {
  // Some list endpoints omit avatars. Share the public-profile cache so each
  // user's current photo stays consistent across screens and repeated rows.
  const profile = useQuery({
    queryKey: ['public-profile', userId],
    queryFn: async () => (await apiClient.get<{ avatarUrl?: string | null }>(
      `/users/${userId}/public`,
    )).data,
    enabled: Boolean(userId),
    staleTime: 60_000,
  });
  const uri = profile.data?.avatarUrl !== undefined ? profile.data.avatarUrl : avatarUrl;
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2,
      overflow: 'hidden', alignItems: 'center', justifyContent: 'center',
      backgroundColor: colors.primary.soft }}>
      {uri && failedUri !== uri ? (
        <Image key={uri} source={{ uri }} style={{ width: size, height: size }}
          contentFit="cover" recyclingKey={uri} onError={() => setFailedUri(uri)} />
      ) : <User size={size / 2} color={colors.primary.DEFAULT} />}
    </View>
  );
}
