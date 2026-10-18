import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Camera, ChevronLeft, ImagePlus, X } from 'lucide-react-native';
import { EmptyState } from '../../../components/ui/EmptyState';
import { useRental } from '../../../hooks/useRentals';
import { apiClient } from '../../../services/api/client';
import { Dispute, DisputesService } from '../../../services/disputes/disputes.service';
import { RentalsService } from '../../../services/rentals/rentals.service';
import { getStatusLabel } from '../../../utils/status-labels';
import { parseThousandsVnd } from '../../../utils/money-input';

type Mode = 'damage' | 'not-returned' | undefined;

function appendImage(formData: FormData, asset: ImagePicker.ImagePickerAsset) {
  formData.append(
    'file',
    {
      uri: asset.uri,
      name: asset.fileName ?? `dispute-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    } as unknown as Blob,
  );
}

export default function RentalDisputeScreen() {
  const params = useLocalSearchParams<{ id: string; mode?: string }>();
  const rentalId = Array.isArray(params.id) ? params.id[0] : params.id;
  const mode: Mode = params.mode === 'damage' || params.mode === 'not-returned' ? params.mode : undefined;
  const router = useRouter();
  const queryClient = useQueryClient();
  const rentalQuery = useRental(rentalId);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<{ id: string }>('/auth/me')).data,
  });
  const disputesQuery = useQuery({
    queryKey: ['disputes', 'mine', rentalId],
    queryFn: () => DisputesService.listMine(),
    enabled: Boolean(rentalId) && !mode,
  });
  const [description, setDescription] = useState('');
  const [estimate, setEstimate] = useState('');
  const parsedEstimate = parseThousandsVnd(estimate);
  const [response, setResponse] = useState('');
  const [evidenceImages, setEvidenceImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const uploadEvidenceImages = async () => {
    const evidenceIds: string[] = [];
    for (const image of evidenceImages) {
      const formData = new FormData();
      appendImage(formData, image);
      const upload = await apiClient.post<{ url: string; fileKey?: string }>(
        '/assets/upload-image',
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 30_000 },
      );
      const evidence = await RentalsService.uploadEvidence(rentalId, {
        fileUrl: upload.data.url,
        fileKey: upload.data.fileKey,
        tag: 'DISPUTE',
      });
      evidenceIds.push(evidence.id);
    }
    return evidenceIds;
  };

  const finish = () => {
    void queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', rentalId] });
    void queryClient.invalidateQueries({ queryKey: ['rentals', 'list'] });
    void queryClient.invalidateQueries({ queryKey: ['disputes', 'mine', rentalId] });
    router.back();
  };

  const issueMutation = useMutation({
    mutationFn: async () => {
      const evidenceIds = await uploadEvidenceImages();
      if (mode === 'damage') {
        return RentalsService.reportIssue(rentalId, {
          description: description.trim(),
          ...(estimate.trim() && parsedEstimate !== null ? { repairEstimate: parsedEstimate } : {}),
          ...(evidenceIds.length ? { evidenceIds } : {}),
        });
      }
      return RentalsService.markAssetNotReturned(rentalId, description, evidenceIds);
    },
    onSuccess: finish,
    onError: (error: any) => {
      Alert.alert('Không thể mở tranh chấp', error.response?.data?.message ?? 'Vui lòng thử lại.');
    },
  });

  const dispute = disputesQuery.data?.find((item) => item.rentalId === rentalId);
  const respondMutation = useMutation({
    mutationFn: async (item: Dispute) => {
      const evidenceIds = await uploadEvidenceImages();
      return DisputesService.respond(item.id, {
        content: response.trim(),
        ...(evidenceIds.length ? { evidenceIds } : {}),
      });
    },
    onSuccess: () => {
      setResponse('');
      setEvidenceImages([]);
      void disputesQuery.refetch();
    },
    onError: () => Alert.alert('Không thể gửi phản hồi', 'Tranh chấp có thể đã đóng hoặc bạn không có quyền truy cập.'),
  });
  const acceptMutation = useMutation({
    mutationFn: (item: Dispute) => DisputesService.acceptDamageReport(item.id),
    onSuccess: finish,
    onError: () => Alert.alert('Không thể chấp nhận báo cáo', 'Đây không phải tranh chấp hư hỏng đang hoạt động mà bạn có thể chấp nhận.'),
  });

  if (rentalQuery.isLoading || meQuery.isLoading || (!mode && disputesQuery.isLoading)) {
    return <SafeAreaView className="flex-1 items-center justify-center bg-background"><ActivityIndicator /></SafeAreaView>;
  }

  if (rentalQuery.isError || !rentalQuery.data || meQuery.isError || !meQuery.data) {
    return <SafeAreaView className="flex-1 bg-background"><EmptyState title="Không thể tải tranh chấp" description="Kiểm tra kết nối rồi thử lại." buttonText="Quay lại" onPress={() => router.back()} /></SafeAreaView>;
  }

  if (mode) {
    const isDamage = mode === 'damage';
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header title={isDamage ? 'Báo hư hỏng' : 'Báo chưa trả tài sản'} onBack={() => router.back()} />
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          <Text className="mb-3 text-lg font-extrabold text-text-primary">{rentalQuery.data.asset?.title ?? 'Đơn thuê'}</Text>
          <TextInput
            className="min-h-28 rounded-xl border border-border bg-surface px-4 py-3 text-text-primary"
            multiline
            textAlignVertical="top"
            placeholder={isDamage ? 'Mô tả hư hỏng...' : 'Mô tả lý do tài sản chưa được trả...'}
            value={description}
            onChangeText={setDescription}
          />
          <EvidencePicker images={evidenceImages} setImages={setEvidenceImages} />
          {isDamage ? (
            <View>
              <Text className="mt-3 text-sm font-semibold text-text-primary">Chi phí sửa chữa dự kiến (nghìn VND, không bắt buộc)</Text>
              <TextInput
                className="mt-3 rounded-xl border border-border bg-surface px-4 py-3 text-text-primary"
                keyboardType="decimal-pad"
                placeholder="Chi phí sửa chữa (nghìn VND, không bắt buộc)"
                value={estimate}
                onChangeText={setEstimate}
              />
              {estimate.trim() ? <Text className="mt-1 text-xs text-text-secondary">
                {parsedEstimate === null ? 'Nhập số hợp lệ, tối đa 3 chữ số sau dấu phẩy.' : `Tương đương ${parsedEstimate.toLocaleString('vi-VN')}đ`}
              </Text> : null}
            </View>
          ) : null}
          <PrimaryButton label="Gửi tranh chấp" disabled={!description.trim() || issueMutation.isPending}
            onPress={() => {
              if (isDamage && estimate.trim() && parsedEstimate === null) {
                Alert.alert('Chi phí không hợp lệ', 'Nhập chi phí sửa chữa theo nghìn VND.');
                return;
              }
              issueMutation.mutate();
            }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!dispute) {
    return <SafeAreaView className="flex-1 bg-background"><EmptyState title="Không tìm thấy tranh chấp" description="Tranh chấp có thể đã được giải quyết hoặc bạn không có quyền truy cập." buttonText="Quay lại" onPress={() => router.back()} /></SafeAreaView>;
  }

  const canAccept = dispute.reason === 'RETURN_ISSUE' && dispute.openedById === dispute.rental.ownerId && meQuery.data.id === dispute.rental.renterId;
  const mutable = ['OPEN', 'WAITING_RESPONSE', 'UNDER_REVIEW'].includes(dispute.status);
  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header title="Chi tiết tranh chấp" onBack={() => router.back()} />
      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xl font-extrabold text-text-primary">{dispute.rental.asset?.title ?? 'Tranh chấp'}</Text>
          <Text className="mt-2 text-text-secondary">{dispute.description}</Text>
          <Text className="mt-3 font-bold text-danger">Trạng thái: {getStatusLabel(dispute.status)}</Text>
          {dispute.resolutionSummary ? <Text className="mt-2 text-text-secondary">Kết quả xử lý: {dispute.resolutionSummary}</Text> : null}
        </View>
        <EvidenceGallery evidences={dispute.evidences ?? []} />
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 font-extrabold text-text-primary">Phản hồi</Text>
          <TextInput className="min-h-28 rounded-xl border border-border bg-background px-4 py-3 text-text-primary" multiline textAlignVertical="top" placeholder="Nhập phản hồi..." value={response} onChangeText={setResponse} />
          <EvidencePicker images={evidenceImages} setImages={setEvidenceImages} />
          <PrimaryButton label="Gửi phản hồi" disabled={!mutable || (!response.trim() && !evidenceImages.length) || respondMutation.isPending} onPress={() => respondMutation.mutate(dispute)} />
          {canAccept ? <PrimaryButton label="Chấp nhận báo cáo hư hỏng" disabled={!mutable || acceptMutation.isPending} onPress={() => acceptMutation.mutate(dispute)} /> : null}
        </View>
        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 font-extrabold text-text-primary">Diễn biến</Text>
          {dispute.events.map((event) => <View key={event.id} className="mb-3 border-b border-divider pb-3"><Text className="font-bold text-text-primary">{getStatusLabel(event.eventType)}</Text><Text className="mt-1 text-text-secondary">{event.content}</Text></View>)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function EvidencePicker({
  images,
  setImages,
}: {
  images: ImagePicker.ImagePickerAsset[];
  setImages: (images: ImagePicker.ImagePickerAsset[]) => void;
}) {
  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: Math.max(1, 5 - images.length),
      quality: 0.9,
    });
    if (!result.canceled) setImages([...images, ...result.assets].slice(0, 5));
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Cần quyền camera', 'Hãy cấp quyền camera để chụp ảnh bằng chứng.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.9 });
    if (!result.canceled && result.assets[0]) setImages([...images, result.assets[0]].slice(0, 5));
  };

  const chooseSource = () => {
    Alert.alert('Thêm ảnh bằng chứng', 'Chụp ảnh mới hoặc chọn ảnh có sẵn để làm rõ tình trạng tài sản.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chụp ảnh', onPress: () => void takePhoto() },
      { text: 'Chọn từ thư viện', onPress: () => void pickFromLibrary() },
    ]);
  };

  return (
    <View className="mt-3 rounded-xl border border-dashed border-border bg-surface-secondary p-3">
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="font-bold text-text-primary">Ảnh bằng chứng</Text>
          <Text className="mt-1 text-xs text-text-secondary">Có thể thêm tối đa 5 ảnh để xác định hư hỏng.</Text>
        </View>
        <TouchableOpacity accessibilityLabel="Thêm ảnh bằng chứng" className="flex-row items-center rounded-lg bg-primary-soft px-3 py-2" onPress={chooseSource} disabled={images.length >= 5}>
          <Camera size={16} color="#2F6B57" />
          <Text className="ml-1 font-bold text-primary">Thêm ảnh</Text>
        </TouchableOpacity>
      </View>
      {images.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
          {images.map((image, index) => (
            <View key={`${image.uri}-${index}`} className="mr-2">
              <Image source={{ uri: image.uri }} style={{ width: 72, height: 72, borderRadius: 10 }} contentFit="cover" />
              <TouchableOpacity accessibilityLabel="Xóa ảnh bằng chứng" className="absolute -right-1 -top-1 rounded-full bg-danger p-1" onPress={() => setImages(images.filter((_, itemIndex) => itemIndex !== index))}>
                <X size={12} color="white" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      ) : <ImagePlus size={22} color="#6B7280" />}
    </View>
  );
}

function EvidenceGallery({ evidences }: { evidences: Dispute['evidences'] }) {
  const images = evidences.filter((item) => item.evidence?.fileUrl);
  if (!images.length) return null;
  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-3 font-extrabold text-text-primary">Ảnh bằng chứng ({images.length})</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {images.map((item) => <Image key={item.id} source={{ uri: item.evidence.fileUrl }} style={{ width: 110, height: 110, borderRadius: 12, marginRight: 8 }} contentFit="cover" />)}
      </ScrollView>
    </View>
  );
}

function Header({ title, onBack }: { title: string; onBack: () => void }) {
  return <View className="flex-row items-center border-b border-border bg-surface px-4 py-3"><TouchableOpacity onPress={onBack} className="mr-3 rounded-full p-2"><ChevronLeft size={26} color="#1F2937" /></TouchableOpacity><Text className="text-lg font-extrabold text-text-primary">{title}</Text></View>;
}

function PrimaryButton({ label, disabled, onPress }: { label: string; disabled: boolean; onPress: () => void }) {
  return <TouchableOpacity className={`mt-3 min-h-12 items-center justify-center rounded-xl bg-primary px-4 ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}><Text className="font-extrabold text-white">{label}</Text></TouchableOpacity>;
}
