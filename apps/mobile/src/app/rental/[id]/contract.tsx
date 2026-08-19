import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CheckCircle, ChevronLeft, FileText, Shield } from 'lucide-react-native';
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
import { EmptyState } from '../../../components/ui/EmptyState';
import { useRental } from '../../../hooks/useRentals';
import { apiClient } from '../../../services/api/client';
import { User } from '../../../types/domain';
import { colors } from '../../../theme/colors';

const money = new Intl.NumberFormat('vi-VN', {
  style: 'currency',
  currency: 'VND',
});

export default function ContractScreen() {
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [agreed, setAgreed] = useState(false);
  const rentalQuery = useRental(id);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const contract = rentalQuery.data?.contract;
  const hasSigned = Boolean(
    meQuery.data?.id &&
      contract?.signatures.some((signature) => signature.userId === meQuery.data?.id),
  );

  const signMutation = useMutation({
    mutationFn: () =>
      apiClient.post(`/rentals/${id}/sign`, {
        signatureMethod: 'IN_APP',
        deviceInfo: 'Borrow Hub mobile application',
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rentals', 'detail', id] });
      Alert.alert('Đã ký hợp đồng', 'Chữ ký điện tử của bạn đã được ghi nhận.');
    },
    onError: (error) => {
      const message =
        error instanceof AxiosError
          ? (error.response?.data as { message?: string } | undefined)?.message
          : undefined;
      Alert.alert('Không thể ký hợp đồng', message ?? 'Vui lòng thử lại sau.');
    },
  });

  if (rentalQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  if (rentalQuery.isError || !contract) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header onBack={() => router.back()} />
        <EmptyState
          icon={<FileText size={42} color={colors.text.muted} />}
          title="Hợp đồng chưa sẵn sàng"
          description="Hợp đồng điện tử được tạo sau khi đơn thuê được duyệt và thanh toán thành công."
          buttonText="Quay lại đơn thuê"
          onPress={() => router.back()}
        />
      </SafeAreaView>
    );
  }

  const snapshot = contract.snapshot;

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header onBack={() => router.back()} />
      <ScrollView className="flex-1" contentContainerClassName="px-5 py-6 pb-10">
        <View className="mb-6 items-center">
          <View className="mb-3 h-16 w-16 items-center justify-center rounded-full border border-primary/20 bg-primary-soft">
            <Shield size={32} color={colors.primary.DEFAULT} />
          </View>
          <Text className="text-center text-xl font-extrabold uppercase tracking-wider text-text-primary">
            Thỏa thuận thuê tài sản
          </Text>
          <Text className="mt-1 font-semibold text-text-secondary">
            Số {contract.contractNumber} · Phiên bản {contract.version}
          </Text>
          <View className="mt-3 rounded-full bg-success/10 px-3 py-1.5">
            <Text className="text-xs font-extrabold uppercase text-success">
              {contract.status === 'ACTIVE' ? 'Đã có hiệu lực' : 'Chờ đủ chữ ký'}
            </Text>
          </View>
        </View>

        <ContractSection title="Các bên tham gia">
          <ContractLine label="Chủ sở hữu" value={snapshot.owner.fullName} />
          <ContractLine label="Người thuê" value={snapshot.renter.fullName} />
        </ContractSection>

        <ContractSection title="Tài sản và thời hạn">
          <ContractLine label="Tài sản" value={snapshot.asset.title} />
          {snapshot.asset.serialNumber ? (
            <ContractLine label="Số sê-ri" value={snapshot.asset.serialNumber} />
          ) : null}
          <ContractLine
            label="Bắt đầu"
            value={format(new Date(snapshot.rental.startAt), 'HH:mm, dd/MM/yyyy', {
              locale: vi,
            })}
          />
          <ContractLine
            label="Kết thúc"
            value={format(new Date(snapshot.rental.endAt), 'HH:mm, dd/MM/yyyy', {
              locale: vi,
            })}
          />
        </ContractSection>

        <ContractSection title="Giá trị hợp đồng">
          <ContractLine label="Tiền thuê" value={money.format(snapshot.rental.rentalFee)} />
          <ContractLine label="Phí dịch vụ" value={money.format(snapshot.rental.serviceFee)} />
          <ContractLine label="Phí giao nhận" value={money.format(snapshot.rental.deliveryFee)} />
          <ContractLine
            label="Tổng thanh toán"
            value={money.format(snapshot.rental.totalAmount)}
            emphasized
          />
        </ContractSection>

        <ContractSection title="Điều khoản sử dụng">
          <Text className="leading-6 text-text-secondary">
            Người thuê có trách nhiệm sử dụng đúng mục đích, bảo quản và hoàn trả tài sản
            đúng thời hạn trong tình trạng đã ghi nhận khi bàn giao. Chủ sở hữu cam kết tài
            sản hoạt động đúng mô tả. Mọi giao nhận phải được hai bên xác nhận trong ứng
            dụng; hư hỏng, mất mát hoặc bất đồng được xử lý qua quy trình tranh chấp của
            Borrow Hub và bằng chứng đã lưu trên hệ thống.
          </Text>
        </ContractSection>

        <View className="rounded-2xl border border-border bg-surface p-4">
          <Text className="text-xs font-bold uppercase text-text-secondary">
            Mã kiểm tra nội dung
          </Text>
          <Text selectable className="mt-2 font-mono text-xs leading-5 text-text-muted">
            {contract.contentHash}
          </Text>
        </View>

        {!hasSigned ? (
          <TouchableOpacity
            className="mt-6 flex-row items-center"
            onPress={() => setAgreed((value) => !value)}
          >
            <View
              className={`mr-3 h-6 w-6 items-center justify-center rounded-md border ${
                agreed ? 'border-primary bg-primary' : 'border-border bg-surface'
              }`}
            >
              {agreed ? <CheckCircle size={16} color="white" /> : null}
            </View>
            <Text className="flex-1 leading-5 text-text-primary">
              Tôi đã đọc, hiểu và đồng ý với toàn bộ nội dung hợp đồng điện tử này.
            </Text>
          </TouchableOpacity>
        ) : (
          <View className="mt-6 flex-row items-center rounded-2xl bg-success/10 p-4">
            <CheckCircle size={22} color={colors.success} />
            <Text className="ml-3 flex-1 font-extrabold text-success">
              Bạn đã ký hợp đồng này
            </Text>
          </View>
        )}
      </ScrollView>

      {!hasSigned ? (
        <View className="border-t border-border bg-surface px-5 py-4">
          <TouchableOpacity
            className={`min-h-14 flex-row items-center justify-center rounded-xl ${
              agreed && !signMutation.isPending ? 'bg-primary' : 'bg-gray-300'
            }`}
            disabled={!agreed || signMutation.isPending}
            onPress={() => signMutation.mutate()}
          >
            {signMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <FileText size={20} color="white" />
                <Text className="ml-2 text-lg font-extrabold text-white">
                  Ký hợp đồng điện tử
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

function Header({ onBack }: { onBack: () => void }) {
  return (
    <View className="min-h-16 flex-row items-center justify-between border-b border-border bg-surface px-4 py-3">
      <TouchableOpacity
        accessibilityLabel="Quay lại"
        className="min-h-11 min-w-11 items-center justify-center rounded-full"
        onPress={onBack}
      >
        <ChevronLeft size={28} color={colors.text.primary} />
      </TouchableOpacity>
      <Text className="text-lg font-extrabold text-text-primary">Hợp đồng điện tử</Text>
      <View className="w-11" />
    </View>
  );
}

function ContractSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-5">
      <Text className="mb-3 text-base font-extrabold uppercase tracking-wide text-text-primary">
        {title}
      </Text>
      {children}
    </View>
  );
}

function ContractLine({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <View className="flex-row justify-between border-b border-border py-2.5 last:border-b-0">
      <Text className="mr-4 flex-1 text-text-secondary">{label}</Text>
      <Text
        className={`max-w-[60%] text-right ${
          emphasized ? 'font-extrabold text-primary' : 'font-bold text-text-primary'
        }`}
      >
        {value}
      </Text>
    </View>
  );
}
