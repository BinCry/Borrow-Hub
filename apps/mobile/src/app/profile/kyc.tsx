import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { Camera, CheckCircle2, ChevronLeft, CreditCard, ShieldCheck, UserRound } from 'lucide-react-native';
import { useState } from 'react';
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
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';

type VerificationStatus = {
  verificationStatus: 'NOT_STARTED' | 'PENDING' | 'VERIFIED' | 'REJECTED';
  maskedDocumentNumber?: string | null;
  hasDocumentFront: boolean;
  hasDocumentBack: boolean;
  hasSelfie: boolean;
};

type EvidenceKind = 'documentFront' | 'documentBack' | 'selfie';

function appendImage(formData: FormData, name: EvidenceKind, asset: ImagePicker.ImagePickerAsset) {
  formData.append(
    name,
    {
      uri: asset.uri,
      name: asset.fileName ?? `${name}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob,
  );
}

export default function KycScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [documentNumber, setDocumentNumber] = useState('');
  const [images, setImages] = useState<Partial<Record<EvidenceKind, ImagePicker.ImagePickerAsset>>>({});
  const statusQuery = useQuery({
    queryKey: ['kyc', 'me'],
    queryFn: async () =>
      (await apiClient.get<VerificationStatus | null>('/kyc/me')).data,
  });
  const submitMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('documentType', 'CCCD');
      formData.append('documentNumber', documentNumber.trim());
      appendImage(formData, 'documentFront', images.documentFront!);
      appendImage(formData, 'documentBack', images.documentBack!);
      appendImage(formData, 'selfie', images.selfie!);
      return apiClient.post('/kyc/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 30_000,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['kyc', 'me'] });
      Alert.alert(
        'Đã gửi hồ sơ',
        'Hồ sơ của bạn đã được mã hóa và chuyển sang hàng đợi kiểm duyệt.',
      );
    },
    onError: () => {
      Alert.alert(
        'Không thể gửi hồ sơ',
        'Kiểm tra ảnh, số CCCD và kết nối mạng rồi thử lại.',
      );
    },
  });

  const pickImage = async (kind: EvidenceKind) => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: kind === 'selfie' ? [1, 1] : [16, 10],
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]) {
      setImages((current) => ({ ...current, [kind]: result.assets[0] }));
    }
  };

  const currentStatus = statusQuery.data?.verificationStatus;
  const isLocked = currentStatus === 'PENDING' || currentStatus === 'VERIFIED';
  const canSubmit =
    /^[0-9]{12}$/.test(documentNumber.trim()) &&
    Boolean(images.documentFront && images.documentBack && images.selfie) &&
    !submitMutation.isPending;

  const evidenceCards: {
    kind: EvidenceKind;
    title: string;
    description: string;
    icon: typeof CreditCard;
  }[] = [
    {
      kind: 'documentFront',
      title: 'Mặt trước CCCD',
      description: 'Ảnh rõ nét, không lóa và đủ bốn góc',
      icon: CreditCard,
    },
    {
      kind: 'documentBack',
      title: 'Mặt sau CCCD',
      description: 'Thông tin và mã QR phải đọc được',
      icon: CreditCard,
    },
    {
      kind: 'selfie',
      title: 'Ảnh chân dung',
      description: 'Chụp thẳng mặt trong điều kiện đủ sáng',
      icon: UserRound,
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity
          accessibilityLabel="Quay lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => router.back()}
        >
          <ChevronLeft size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold text-text-primary">
          Xác thực danh tính
        </Text>
        <View className="w-11" />
      </View>

      {statusQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : (
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
            keyboardShouldPersistTaps="handled"
          >
            <View className="items-center pb-6">
              <View className="h-20 w-20 items-center justify-center rounded-full bg-primary-soft">
                <ShieldCheck size={40} color={colors.primary.DEFAULT} />
              </View>
              <Text className="mt-4 text-center text-2xl font-extrabold text-text-primary">
                Bảo vệ cộng đồng Borrow Hub
              </Text>
              <Text className="mt-2 text-center leading-6 text-text-secondary">
                Tài liệu chỉ được lưu trong vùng riêng tư và chỉ nhân sự có quyền mới có thể duyệt.
              </Text>
            </View>

            {currentStatus ? (
              <View
                className={`mb-6 rounded-2xl border p-4 ${
                  currentStatus === 'VERIFIED'
                    ? 'border-success/30 bg-success/10'
                    : currentStatus === 'PENDING'
                      ? 'border-warning/30 bg-warning/10'
                      : 'border-danger/30 bg-danger/10'
                }`}
              >
                <View className="flex-row items-center">
                  <CheckCircle2
                    size={20}
                    color={
                      currentStatus === 'VERIFIED'
                        ? colors.success
                        : currentStatus === 'PENDING'
                          ? colors.warning
                          : colors.danger
                    }
                  />
                  <Text className="ml-2 font-bold text-text-primary">
                    {currentStatus === 'VERIFIED'
                      ? 'Danh tính đã được xác thực'
                      : currentStatus === 'PENDING'
                        ? 'Hồ sơ đang chờ duyệt'
                        : 'Hồ sơ cần được gửi lại'}
                  </Text>
                </View>
                {statusQuery.data?.maskedDocumentNumber ? (
                  <Text className="mt-2 text-text-secondary">
                    Giấy tờ: {statusQuery.data.maskedDocumentNumber}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {!isLocked ? (
              <>
                <Text className="mb-2 ml-1 text-xs font-extrabold uppercase tracking-widest text-text-secondary">
                  Số căn cước công dân
                </Text>
                <TextInput
                  accessibilityLabel="Số căn cước công dân"
                  className="mb-6 min-h-14 rounded-2xl border border-border bg-surface px-4 text-base text-text-primary"
                  placeholder="Nhập 12 chữ số"
                  placeholderTextColor={colors.text.muted}
                  keyboardType="number-pad"
                  maxLength={12}
                  value={documentNumber}
                  onChangeText={setDocumentNumber}
                />

                <Text className="mb-3 ml-1 text-xs font-extrabold uppercase tracking-widest text-text-secondary">
                  Tài liệu xác minh
                </Text>
                {evidenceCards.map(({ kind, title, description, icon: Icon }) => {
                  const selected = images[kind];
                  return (
                    <TouchableOpacity
                      key={kind}
                      accessibilityLabel={`Chọn ${title}`}
                      className="mb-4 min-h-28 overflow-hidden rounded-2xl border-2 border-dashed border-primary/30 bg-surface"
                      onPress={() => void pickImage(kind)}
                    >
                      {selected ? (
                        <View className="flex-row items-center p-3">
                          <Image
                            source={{ uri: selected.uri }}
                            style={{ width: 88, height: 72, borderRadius: 12 }}
                            contentFit="cover"
                          />
                          <View className="ml-4 flex-1">
                            <Text className="font-bold text-text-primary">{title}</Text>
                            <Text className="mt-1 text-sm text-success">Đã chọn ảnh</Text>
                            <Text className="mt-1 text-xs text-text-muted">Nhấn để thay ảnh</Text>
                          </View>
                        </View>
                      ) : (
                        <View className="flex-row items-center p-5">
                          <View className="h-14 w-14 items-center justify-center rounded-full bg-primary-soft">
                            <Icon size={27} color={colors.primary.DEFAULT} />
                          </View>
                          <View className="ml-4 flex-1">
                            <Text className="font-bold text-text-primary">{title}</Text>
                            <Text className="mt-1 text-sm leading-5 text-text-secondary">
                              {description}
                            </Text>
                          </View>
                          <Camera size={21} color={colors.primary.DEFAULT} />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  className={`mt-2 min-h-14 items-center justify-center rounded-xl ${
                    canSubmit ? 'bg-primary' : 'bg-gray-300'
                  }`}
                  disabled={!canSubmit}
                  onPress={() => submitMutation.mutate()}
                >
                  {submitMutation.isPending ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="text-lg font-bold text-white">Gửi hồ sơ xác thực</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}
