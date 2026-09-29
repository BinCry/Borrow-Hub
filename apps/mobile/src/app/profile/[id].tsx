import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, ShieldCheck, User } from 'lucide-react-native';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

type PublicProfile = {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  trustScore?: number;
  createdAt?: string;
};

export default function PublicProfileScreen() {
  const router = useRouter();
  const { id, name, avatar, trustScore } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatar?: string;
    trustScore?: string;
  }>();
  const profileQuery = useQuery({
    queryKey: ['public-profile', id],
    queryFn: async () => (await apiClient.get<PublicProfile>(`/users/${id}/public`)).data,
    enabled: Boolean(id),
  });
  const profile = profileQuery.data ?? (name ? {
    id: id ?? '',
    fullName: name,
    avatarUrl: avatar || null,
    trustScore: Number(trustScore ?? 0),
  } : undefined);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity accessibilityLabel="Quay lại" className="mr-3 rounded-full p-1" onPress={() => router.back()}>
          <ArrowLeft size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-text-primary">Hồ sơ người đăng</Text>
      </View>

      {profileQuery.isLoading ? (
        <View className="flex-1 items-center justify-center"><ActivityIndicator color={colors.primary.DEFAULT} /></View>
      ) : !profile ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-center text-text-secondary">Không thể tải hồ sơ người đăng.</Text>
        </View>
      ) : (
        <View className="items-center bg-surface px-5 pb-8 pt-8">
          <View className="h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-primary-soft bg-primary-soft">
            {profile.avatarUrl ? <Image source={{ uri: profile.avatarUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : <User size={42} color={colors.primary.DEFAULT} />}
          </View>
          <Text className="mt-4 text-2xl font-extrabold text-text-primary">{profile.fullName}</Text>
          <View className="mt-2 flex-row items-center rounded-full bg-primary-soft px-3 py-1.5">
            <ShieldCheck size={16} color={colors.success} />
            <Text className="ml-1.5 font-semibold text-success">Điểm uy tín {profile.trustScore ?? 0}</Text>
          </View>
          <Text className="mt-4 text-sm text-text-secondary">Thông tin công khai của người cho thuê</Text>
        </View>
      )}
    </SafeAreaView>
  );
}
