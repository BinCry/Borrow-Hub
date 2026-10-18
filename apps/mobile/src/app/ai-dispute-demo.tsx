import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  ClipboardCheck,
  ImagePlus,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { colors } from '../theme/colors';
import { apiClient } from '../services/api/client';

type PickedImage = ImagePicker.ImagePickerAsset;
type ReviewState = 'idle' | 'analyzing' | 'ready';
type Decision = 'approved' | 'rejected' | null;
type AiAnalysis = {
  damaged: boolean;
  confidence: number;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  summary: string;
  findings: { area: string; issue: string; confidence: number }[];
  recommendedAction: string;
  suggestedCompensation: number;
  limitations: string[];
};

export default function AiDisputeDemoScreen() {
  const router = useRouter();
  const [beforeImage, setBeforeImage] = useState<PickedImage | null>(null);
  const [afterImage, setAfterImage] = useState<PickedImage | null>(null);
  const [reviewState, setReviewState] = useState<ReviewState>('idle');
  const [decision, setDecision] = useState<Decision>(null);
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null);

  const pickImage = async (target: 'before' | 'after') => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    if (target === 'before') setBeforeImage(result.assets[0]);
    else setAfterImage(result.assets[0]);
    setReviewState('idle');
    setAnalysis(null);
    setDecision(null);
  };

  const analyzeImages = async () => {
    if (!beforeImage || !afterImage) {
      Alert.alert('Thiếu ảnh đối chiếu', 'Hãy chọn đủ ảnh trước khi thuê và sau khi thuê.');
      return;
    }
    setReviewState('analyzing');
    setDecision(null);
    try {
      const formData = new FormData();
      formData.append('images', {
        uri: beforeImage.uri,
        name: beforeImage.fileName ?? 'before.jpg',
        type: beforeImage.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      formData.append('images', {
        uri: afterImage.uri,
        name: afterImage.fileName ?? 'after.jpg',
        type: afterImage.mimeType ?? 'image/jpeg',
      } as unknown as Blob);
      const response = await apiClient.post<AiAnalysis>('/disputes/ai-analyze', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120_000,
      });
      setAnalysis(response.data);
      setReviewState('ready');
    } catch (error: any) {
      setReviewState('idle');
      Alert.alert('Không thể phân tích ảnh', error.response?.data?.message ?? 'Kiểm tra OPENAI_API_KEY và kết nối API rồi thử lại.');
    }
  };

  const hasResult = reviewState === 'ready' && Boolean(analysis);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <View className="flex-row items-center border-b border-border bg-surface px-4 py-3">
        <TouchableOpacity accessibilityLabel="Quay lại" className="mr-3 rounded-full p-2" onPress={() => router.back()}>
          <ChevronLeft size={26} color={colors.text.primary} />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-lg font-extrabold text-text-primary">AI xử lý tranh chấp</Text>
          <Text className="text-xs font-medium text-text-secondary">Kiểm tra tình trạng tài sản</Text>
        </View>
        <View className="rounded-full bg-primary-soft p-2">
          <Sparkles size={18} color={colors.primary.DEFAULT} />
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="rounded-2xl bg-primary p-5">
          <View className="flex-row items-center">
            <View className="mr-3 rounded-xl bg-white/15 p-2.5"><ShieldCheck size={24} color="white" /></View>
            <View className="flex-1">
              <Text className="text-lg font-extrabold text-white">Đối chiếu bằng hình ảnh</Text>
              <Text className="mt-1 text-sm leading-5 text-white/80">AI tìm điểm khác biệt giữa lúc bàn giao và lúc trả tài sản.</Text>
            </View>
          </View>
          <View className="mt-4 flex-row items-center">
            <Step number="1" label="Tải ảnh" active={!hasResult} />
            <View className="mx-2 h-px flex-1 bg-white/30" />
            <Step number="2" label="AI phân tích" active={hasResult} />
            <View className="mx-2 h-px flex-1 bg-white/30" />
            <Step number="3" label="Admin duyệt" active={decision !== null} />
          </View>
        </View>

        <Text className="mt-6 text-base font-extrabold text-text-primary">1. Chọn ảnh đối chiếu</Text>
        <Text className="mt-1 text-sm leading-5 text-text-secondary">Ảnh nên chụp cùng góc và đủ sáng để AI có kết quả đáng tin cậy hơn.</Text>
        <View className="mt-3 flex-row gap-3">
          <PhotoSlot title="Trước khi thuê" image={beforeImage} onPress={() => void pickImage('before')} />
          <PhotoSlot title="Sau khi thuê" image={afterImage} onPress={() => void pickImage('after')} />
        </View>

        <TouchableOpacity
          className={`mt-4 min-h-12 flex-row items-center justify-center rounded-xl bg-primary ${!beforeImage || !afterImage || reviewState === 'analyzing' ? 'opacity-50' : ''}`}
          disabled={!beforeImage || !afterImage || reviewState === 'analyzing'}
          onPress={analyzeImages}
        >
          {reviewState === 'analyzing' ? <ActivityIndicator color="white" /> : <ScanSearch size={19} color="white" />}
          <Text className="ml-2 font-extrabold text-white">{reviewState === 'analyzing' ? 'AI đang phân tích...' : 'Phân tích bằng AI'}</Text>
        </TouchableOpacity>

        {hasResult && analysis ? (
          <>
            <Text className="mt-7 text-base font-extrabold text-text-primary">2. Kết quả phân tích AI</Text>
            <View className={`mt-3 rounded-2xl border p-4 ${analysis.damaged ? 'border-warning/30 bg-warning/10' : 'border-success/30 bg-success/10'}`}>
              <View className="flex-row items-start">
                <View className="mr-3 rounded-full bg-white/60 p-2">{analysis.damaged ? <AlertTriangle size={21} color={colors.warning} /> : <CheckCircle2 size={21} color={colors.success} />}</View>
                <View className="flex-1">
                  <Text className="text-base font-extrabold text-text-primary">{analysis.damaged ? 'Có dấu hiệu hư hỏng mới' : 'Chưa đủ bằng chứng hư hỏng'}</Text>
                  <Text className="mt-1 text-sm leading-5 text-text-secondary">{analysis.summary}</Text>
                </View>
              </View>
              <View className="mt-4 flex-row gap-2">
                <Metric label="Độ tin cậy" value={`${Math.round(analysis.confidence * 100)}%`} />
                <Metric label="Mức độ" value={severityLabel(analysis.severity)} />
              </View>
              {analysis.findings.length ? <View className="mt-3 rounded-xl bg-white/60 p-3">{analysis.findings.map((finding) => <Text key={`${finding.area}-${finding.issue}`} className="mb-1 text-sm text-text-secondary">• {finding.area}: {finding.issue}</Text>)}</View> : null}
            </View>

            <View className="mt-3 rounded-2xl border border-border bg-surface p-4">
              <View className="flex-row items-center"><ClipboardCheck size={19} color={colors.primary.DEFAULT} /><Text className="ml-2 font-extrabold text-text-primary">Đề xuất tự động</Text></View>
              <Text className="mt-3 text-sm leading-5 text-text-secondary">{analysis.recommendedAction} AI chỉ đưa ra đề xuất, không tự kết luận cuối cùng.</Text>
              <View className="mt-3 rounded-xl bg-primary-soft p-3"><Text className="text-sm font-extrabold text-primary-dark">Đề xuất bồi thường: {analysis.suggestedCompensation.toLocaleString('vi-VN')}đ</Text></View>
            </View>

            {analysis.damaged && decision === null ? (
              <AdminReview onApprove={() => setDecision('approved')} onReject={() => setDecision('rejected')} />
            ) : analysis.damaged && decision !== null ? (
              <View className={`mt-4 rounded-2xl p-4 ${decision === 'approved' ? 'bg-success/10' : 'bg-danger/10'}`}>
                <View className="flex-row items-center">
                  {decision === 'approved' ? <CheckCircle2 size={22} color={colors.success} /> : <X size={22} color={colors.danger} />}
                  <Text className={`ml-2 text-base font-extrabold ${decision === 'approved' ? 'text-success' : 'text-danger'}`}>
                    {decision === 'approved' ? 'Admin đã xác nhận xử lý' : 'Admin đã từ chối đề xuất'}
                  </Text>
                </View>
                <Text className="mt-2 text-sm leading-5 text-text-secondary">
                  {decision === 'approved' ? 'Hồ sơ sẽ được áp dụng mức bồi hoàn đề xuất và thông báo cho hai bên.' : 'Hồ sơ được trả lại để hai bên bổ sung bằng chứng hoặc trao đổi thêm.'}
                </Text>
              </View>
            ) : null}
            {analysis.limitations.length ? <Text className="mt-3 text-xs leading-5 text-text-secondary">Lưu ý: {analysis.limitations.join(' ')}</Text> : null}
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function severityLabel(value: AiAnalysis['severity']) {
  return { NONE: 'Không có', LOW: 'Nhẹ', MEDIUM: 'Trung bình', HIGH: 'Nặng' }[value];
}

function Step({ number, label, active }: { number: string; label: string; active: boolean }) {
  return <View className="items-center"><View className={`h-7 w-7 items-center justify-center rounded-full ${active ? 'bg-white' : 'bg-white/20'}`}><Text className={`text-xs font-extrabold ${active ? 'text-primary' : 'text-white'}`}>{number}</Text></View><Text className="mt-1 text-[10px] font-bold text-white/80">{label}</Text></View>;
}

function PhotoSlot({ title, image, onPress }: { title: string; image: PickedImage | null; onPress: () => void }) {
  return (
    <TouchableOpacity className="flex-1 overflow-hidden rounded-2xl border border-dashed border-primary/30 bg-surface" onPress={onPress}>
      {image ? <Image source={{ uri: image.uri }} style={{ width: '100%', height: 150 }} contentFit="cover" /> : <View className="h-[150px] items-center justify-center bg-primary-soft"><ImagePlus size={28} color={colors.primary.DEFAULT} /><Text className="mt-2 text-xs font-bold text-primary">Thêm ảnh</Text></View>}
      <View className="p-3"><Text className="text-sm font-extrabold text-text-primary">{title}</Text><Text className="mt-1 text-xs text-text-secondary">{image ? 'Chạm để đổi ảnh' : 'Bắt buộc'}</Text></View>
    </TouchableOpacity>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <View className="flex-1 rounded-xl bg-white/70 p-3"><Text className="text-xs text-text-secondary">{label}</Text><Text className="mt-1 text-base font-extrabold text-text-primary">{value}</Text></View>;
}

function AdminReview({ onApprove, onReject }: { onApprove: () => void; onReject: () => void }) {
  return (
    <View className="mt-4 rounded-2xl border border-primary/20 bg-surface p-4">
      <View className="flex-row items-center"><ShieldCheck size={19} color={colors.primary.DEFAULT} /><Text className="ml-2 font-extrabold text-text-primary">3. Admin xác nhận cuối cùng</Text></View>
      <Text className="mt-2 text-sm leading-5 text-text-secondary">Admin xem lại ảnh gốc, kết quả AI và quyết định hướng xử lý.</Text>
      <View className="mt-4 flex-row gap-3">
        <TouchableOpacity className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl border border-danger/30 bg-danger/10" onPress={onReject}><X size={18} color={colors.danger} /><Text className="ml-1 font-extrabold text-danger">Từ chối</Text></TouchableOpacity>
        <TouchableOpacity className="min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-success" onPress={onApprove}><Check size={18} color="white" /><Text className="ml-1 font-extrabold text-white">Xác nhận</Text></TouchableOpacity>
      </View>
    </View>
  );
}
