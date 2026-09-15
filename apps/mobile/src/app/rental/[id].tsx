import { format } from 'date-fns';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  Circle,
  Clock,
  CreditCard,
  FileSignature,
  Handshake,
  PackageCheck,
  ReceiptText,
  RefreshCcw,
  UserRound,
  XCircle,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  useApproveRental,
  useCancelRental,
  useDeclineRental,
  useRental,
} from '../../hooks/useRentals';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';
import { RentalStatus, User } from '../../types/domain';

const statusLabels: Record<RentalStatus, string> = {
  PENDING_OWNER: 'Chờ chủ tài sản',
  APPROVED: 'Đã chấp nhận',
  DECLINED: 'Bị từ chối',
  AWAITING_PAYMENT: 'Chờ thanh toán',
  AWAITING_SIGNATURE: 'Chờ ký hợp đồng',
  CONFIRMED: 'Đã xác nhận',
  READY_FOR_HANDOVER: 'Sẵn sàng bàn giao',
  ONGOING: 'Đang thuê',
  RETURN_PENDING: 'Chờ hoàn trả',
  COMPLETED: 'Hoàn tất',
  CANCELLED: 'Đã hủy',
  EXPIRED: 'Hết hạn',
  DISPUTED: 'Đang tranh chấp',
  OVERDUE: 'Quá hạn',
};

const statusDescriptions: Record<RentalStatus, string> = {
  PENDING_OWNER: 'Yêu cầu đang chờ chủ tài sản xác nhận.',
  APPROVED: 'Chủ tài sản đã đồng ý, hệ thống đang chuẩn bị bước tiếp theo.',
  DECLINED: 'Yêu cầu thuê đã bị từ chối.',
  AWAITING_PAYMENT: 'Người thuê cần thanh toán để giữ lịch thuê.',
  AWAITING_SIGNATURE: 'Hai bên cần ký hợp đồng điện tử.',
  CONFIRMED: 'Đơn thuê đã xác nhận và chờ lịch bàn giao.',
  READY_FOR_HANDOVER: 'Hai bên có thể tiến hành bàn giao tài sản.',
  ONGOING: 'Tài sản đang trong thời gian thuê.',
  RETURN_PENDING: 'Đang chờ xác nhận hoàn trả tài sản.',
  COMPLETED: 'Giao dịch đã hoàn tất.',
  CANCELLED: 'Đơn thuê đã bị hủy.',
  EXPIRED: 'Yêu cầu thuê đã hết hạn.',
  DISPUTED: 'Đơn thuê đang có tranh chấp cần xử lý.',
  OVERDUE: 'Tài sản đã quá hạn hoàn trả.',
};

const steps: { label: string; statuses: RentalStatus[] }[] = [
  { label: 'Yêu cầu thuê', statuses: ['PENDING_OWNER'] },
  { label: 'Chủ xác nhận', statuses: ['APPROVED', 'AWAITING_PAYMENT'] },
  { label: 'Thanh toán', statuses: ['AWAITING_SIGNATURE'] },
  { label: 'Ký hợp đồng', statuses: ['CONFIRMED', 'READY_FOR_HANDOVER'] },
  { label: 'Bàn giao', statuses: ['ONGOING', 'RETURN_PENDING', 'OVERDUE'] },
  { label: 'Hoàn tất', statuses: ['COMPLETED'] },
];

function formatMoney(value: number, currency = 'VND') {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return format(new Date(value), 'dd/MM/yyyy HH:mm');
}

function getStepIndex(status: RentalStatus) {
  if (status === 'DECLINED' || status === 'CANCELLED' || status === 'EXPIRED') return 0;
  if (status === 'DISPUTED') return 4;
  const index = steps.findIndex((step) => step.statuses.includes(status));
  return index >= 0 ? index : 0;
}

export default function RentalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const rentalQuery = useRental(id);
  const approveMutation = useApproveRental();
  const declineMutation = useDeclineRental();
  const cancelMutation = useCancelRental();

  const refetch = () => {
    void rentalQuery.refetch();
    void meQuery.refetch();
  };

  if (rentalQuery.isLoading || meQuery.isLoading) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
      </SafeAreaView>
    );
  }

  if (rentalQuery.isError || meQuery.isError || !rentalQuery.data || !meQuery.data) {
    return (
      <SafeAreaView className="flex-1 bg-background" edges={['top']}>
        <Header title="Chi tiết đơn thuê" onBack={() => router.back()} onRefresh={refetch} />
        <EmptyState
          title="Không thể tải đơn thuê"
          description="Đơn thuê có thể không tồn tại, bạn không có quyền xem hoặc kết nối đang gián đoạn."
          buttonText="Thử lại"
          onPress={refetch}
          icon={<AlertCircle size={40} color={colors.danger} />}
        />
      </SafeAreaView>
    );
  }

  const rental = rentalQuery.data;
  const currentUser = meQuery.data;
  const isOwner = rental.ownerId === currentUser.id;
  const isRenter = rental.renterId === currentUser.id;
  const isUpdating =
    approveMutation.isPending || declineMutation.isPending || cancelMutation.isPending;

  const confirmApprove = () => {
    Alert.alert('Chấp nhận yêu cầu thuê?', 'Người thuê sẽ được chuyển sang bước thanh toán.', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Chấp nhận', onPress: () => approveMutation.mutate({ id }) },
    ]);
  };

  const confirmDecline = () => {
    Alert.alert('Từ chối yêu cầu?', 'Yêu cầu thuê sẽ được đóng.', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Từ chối',
        style: 'destructive',
        onPress: () => declineMutation.mutate({ id, reason: 'Không có sẵn' }),
      },
    ]);
  };

  const confirmCancel = () => {
    Alert.alert('Hủy yêu cầu thuê?', 'Yêu cầu của bạn sẽ bị hủy.', [
      { text: 'Không', style: 'cancel' },
      {
        text: 'Hủy yêu cầu',
        style: 'destructive',
        onPress: () => cancelMutation.mutate({ id, reason: 'Đổi ý' }),
      },
    ]);
  };

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top']}>
      <Header title="Chi tiết đơn thuê" onBack={() => router.back()} onRefresh={refetch} />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={rentalQuery.isRefetching || meQuery.isRefetching}
            onRefresh={refetch}
          />
        }
      >
        <View className="rounded-2xl border border-border bg-surface p-4">
          <View className="flex-row items-start justify-between">
            <View className="min-w-0 flex-1 pr-3">
              <Text className="text-xl font-extrabold text-text-primary">
                {rental.asset?.title ?? 'Tài sản'}
              </Text>
              <Text className="mt-2 leading-6 text-text-secondary">
                {statusDescriptions[rental.status]}
              </Text>
            </View>
            <StatusBadge status={rental.status} />
          </View>
          <View className="mt-4 flex-row items-center rounded-xl bg-surface-secondary p-3">
            <CalendarDays size={19} color={colors.primary.DEFAULT} />
            <View className="ml-3 min-w-0 flex-1">
              <Text className="font-bold text-text-primary">
                {formatDate(rental.startAt)} - {formatDate(rental.endAt)}
              </Text>
              <Text className="mt-1 text-sm text-text-secondary">
                Vai trò của bạn: {isOwner ? 'Chủ tài sản' : isRenter ? 'Người thuê' : 'Người xem'}
              </Text>
            </View>
          </View>
        </View>

        <Timeline status={rental.status} />

        <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
          <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">
            Thao tác
          </Text>
          {rental.status === 'PENDING_OWNER' && isOwner ? (
            <View className="flex-row gap-3">
              <ActionButton
                label="Từ chối"
                icon={XCircle}
                tone="danger"
                disabled={isUpdating}
                onPress={confirmDecline}
              />
              <ActionButton
                label="Chấp nhận"
                icon={CheckCircle2}
                tone="success"
                disabled={isUpdating}
                onPress={confirmApprove}
              />
            </View>
          ) : rental.status === 'PENDING_OWNER' && isRenter ? (
            <ActionButton
              label="Hủy yêu cầu"
              icon={XCircle}
              tone="danger"
              disabled={isUpdating}
              onPress={confirmCancel}
            />
          ) : rental.status === 'AWAITING_PAYMENT' && isRenter ? (
            <ActionButton
              label="Thanh toán ngay"
              icon={CreditCard}
              tone="primary"
              disabled={false}
              onPress={() => router.push(`/rental/${id}/payment`)}
            />
          ) : rental.status === 'AWAITING_SIGNATURE' ? (
            <ActionButton
              label="Ký hợp đồng"
              icon={FileSignature}
              tone="primary"
              disabled={false}
              onPress={() => router.push(`/rental/${id}/contract`)}
            />
          ) : rental.status === 'READY_FOR_HANDOVER' ? (
            <ActionButton
              label="Tiến hành bàn giao"
              icon={Handshake}
              tone="primary"
              disabled={false}
              onPress={() => router.push(`/rental/${id}/handover`)}
            />
          ) : rental.status === 'ONGOING' && isRenter ? (
            <ActionButton
              label="Trả tài sản"
              icon={PackageCheck}
              tone="primary"
              disabled={false}
              onPress={() => router.push(`/rental/${id}/return`)}
            />
          ) : rental.status === 'RETURN_PENDING' ? (
            <ActionButton
              label={isOwner ? 'Xác nhận nhận lại' : 'Quét xác nhận hoàn trả'}
              icon={PackageCheck}
              tone="primary"
              disabled={false}
              onPress={() => router.push(`/rental/${id}/handover`)}
            />
          ) : (
            <View className="rounded-xl bg-surface-secondary p-3">
              <Text className="text-center font-semibold text-text-secondary">
                Không có thao tác cần xử lý ở trạng thái này.
              </Text>
            </View>
          )}
        </View>

        <Section title="Tóm tắt thanh toán" icon={ReceiptText}>
          <InfoLine label="Phí thuê" value={formatMoney(rental.pricing.rentalFee, rental.currency)} />
          <InfoLine label="Phí dịch vụ" value={formatMoney(rental.pricing.serviceFee, rental.currency)} />
          <InfoLine label="Phí giao nhận" value={formatMoney(rental.pricing.deliveryFee, rental.currency)} />
          <InfoLine label="Phí trễ hạn" value={formatMoney(rental.pricing.lateFee, rental.currency)} />
          <View className="mt-2 border-t border-border pt-3">
            <InfoLine label="Tổng cộng" value={formatMoney(rental.pricing.totalAmount, rental.currency)} strong />
          </View>
        </Section>

        <Section title="Người liên quan" icon={UserRound}>
          <PartyLine label="Chủ tài sản" name={rental.owner?.fullName ?? rental.ownerId} />
          <PartyLine label="Người thuê" name={rental.renter?.fullName ?? rental.renterId} />
        </Section>

        <Section title="Thông tin kỹ thuật" icon={Clock}>
          <InfoLine label="Mã đơn" value={rental.id} />
          <InfoLine label="Tài sản" value={rental.assetId} />
          <InfoLine label="Cập nhật" value={formatDate(rental.updatedAt)} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Header({
  title,
  onBack,
  onRefresh,
}: {
  title: string;
  onBack: () => void;
  onRefresh: () => void;
}) {
  return (
    <View className="min-h-16 flex-row items-center border-b border-border bg-surface px-4 py-3">
      <TouchableOpacity
        accessibilityLabel="Quay lại"
        className="min-h-11 min-w-11 items-center justify-center rounded-full"
        onPress={onBack}
      >
        <ChevronLeft size={28} color={colors.text.primary} />
      </TouchableOpacity>
      <Text className="flex-1 text-center text-lg font-bold text-text-primary">{title}</Text>
      <TouchableOpacity
        accessibilityLabel="Tải lại"
        className="min-h-11 min-w-11 items-center justify-center rounded-full"
        onPress={onRefresh}
      >
        <RefreshCcw size={22} color={colors.primary.DEFAULT} />
      </TouchableOpacity>
    </View>
  );
}

function StatusBadge({ status }: { status: RentalStatus }) {
  if (status === 'COMPLETED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{statusLabels[status]}</Text>
      </View>
    );
  }

  if (['DECLINED', 'CANCELLED', 'EXPIRED', 'DISPUTED', 'OVERDUE'].includes(status)) {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{statusLabels[status]}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-primary-soft px-3 py-1">
      <Text className="text-xs font-extrabold text-primary">{statusLabels[status]}</Text>
    </View>
  );
}

function Timeline({ status }: { status: RentalStatus }) {
  const currentStep = getStepIndex(status);

  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-4 text-xs font-extrabold uppercase text-text-secondary">
        Tiến trình
      </Text>
      {steps.map((step, index) => {
        const done = index < currentStep || status === 'COMPLETED';
        const active = index === currentStep && status !== 'COMPLETED';
        return (
          <View key={step.label} className="flex-row items-start">
            <View className="items-center">
              {done ? (
                <CheckCircle2 size={21} color={colors.primary.DEFAULT} />
              ) : active ? (
                <Clock size={21} color={colors.warning} />
              ) : (
                <Circle size={21} color={colors.border} />
              )}
              {index < steps.length - 1 ? (
                <View className={`h-9 w-0.5 ${done ? 'bg-primary' : 'bg-border'}`} />
              ) : null}
            </View>
            <View className="ml-3 min-h-12 flex-1">
              <Text
                className={`font-bold ${
                  done || active ? 'text-text-primary' : 'text-text-secondary'
                }`}
              >
                {step.label}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof ReceiptText;
  children: React.ReactNode;
}) {
  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <View className="mb-3 flex-row items-center">
        <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-primary-soft">
          <Icon size={18} color={colors.primary.DEFAULT} />
        </View>
        <Text className="text-xs font-extrabold uppercase text-text-secondary">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <View className="flex-row justify-between py-2">
      <Text className="mr-4 flex-1 text-text-secondary">{label}</Text>
      <Text className={`max-w-[58%] text-right ${strong ? 'text-lg font-extrabold text-primary' : 'font-bold text-text-primary'}`}>
        {value}
      </Text>
    </View>
  );
}

function PartyLine({ label, name }: { label: string; name: string }) {
  return (
    <View className="mb-3 flex-row items-center rounded-xl bg-surface-secondary p-3">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
        <UserRound size={19} color={colors.primary.DEFAULT} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-bold uppercase text-text-secondary">{label}</Text>
        <Text className="mt-0.5 font-extrabold text-text-primary">{name}</Text>
      </View>
    </View>
  );
}

function ActionButton({
  label,
  icon: Icon,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  icon: typeof CheckCircle2;
  tone: 'primary' | 'success' | 'danger';
  disabled: boolean;
  onPress: () => void;
}) {
  if (tone === 'success') {
    return (
      <TouchableOpacity
        className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-success px-4 ${disabled ? 'opacity-50' : ''}`}
        disabled={disabled}
        onPress={onPress}
      >
        <Icon size={18} color="white" />
        <Text className="ml-2 font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  if (tone === 'danger') {
    return (
      <TouchableOpacity
        className={`min-h-12 flex-1 flex-row items-center justify-center rounded-xl bg-danger px-4 ${disabled ? 'opacity-50' : ''}`}
        disabled={disabled}
        onPress={onPress}
      >
        <Icon size={18} color="white" />
        <Text className="ml-2 font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      className={`min-h-12 flex-row items-center justify-center rounded-xl bg-primary px-4 ${disabled ? 'opacity-50' : ''}`}
      disabled={disabled}
      onPress={onPress}
    >
      <Icon size={18} color="white" />
      <Text className="ml-2 font-extrabold text-white">{label}</Text>
    </TouchableOpacity>
  );
}
