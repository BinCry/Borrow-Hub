import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  AlertCircle,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  FileText,
  Image as ImageIcon,
  MessageSquareText,
  RefreshCcw,
  UserRound,
} from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { EmptyState } from '../../../components/ui/EmptyState';
import {
  AdminDispute,
  AdminDisputeStatus,
  AdminService,
  UpdateDisputeStatusPayload,
} from '../../../services/admin/admin.service';
import { colors } from '../../../theme/colors';

const statusLabels: Record<AdminDisputeStatus, string> = {
  OPEN: 'Mới mở',
  WAITING_RESPONSE: 'Chờ phản hồi',
  UNDER_REVIEW: 'Đang xử lý',
  RESOLVED: 'Đã giải quyết',
  REJECTED: 'Từ chối',
  CLOSED: 'Đã đóng',
};

function formatDate(value?: string | null) {
  if (!value) return 'Chưa có';
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isTerminal(status: AdminDisputeStatus) {
  return status === 'RESOLVED' || status === 'REJECTED' || status === 'CLOSED';
}

export default function AdminDisputeDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [note, setNote] = useState('');
  const disputeQuery = useQuery({
    queryKey: ['admin', 'dispute', id],
    queryFn: () => AdminService.getDispute(id),
    enabled: Boolean(id),
  });
  const statusMutation = useMutation({
    mutationFn: ({ payload }: { payload: UpdateDisputeStatusPayload }) =>
      AdminService.updateDisputeStatus(id, payload),
    onSuccess: () => {
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật', 'Kiểm tra quyền xử lý tranh chấp rồi thử lại.');
    },
  });
  const responseMutation = useMutation({
    mutationFn: ({ content }: { content: string }) => AdminService.respondDispute(id, { content }),
    onSuccess: () => {
      setNote('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dispute', id] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'disputes'] });
    },
    onError: () => {
      Alert.alert('Không thể gửi ghi chú', 'Tranh chấp có thể đã đóng hoặc bạn thiếu quyền.');
    },
  });

  const confirmStatus = (status: AdminDisputeStatus, title: string) => {
    const trimmedNote = note.trim();
    const payload: UpdateDisputeStatusPayload = {
      status,
      note: trimmedNote || `Admin changed dispute status to ${status}.`,
    };

    if (isTerminal(status)) {
      payload.resolutionSummary = trimmedNote || `Closed as ${status} from RentLoop admin mobile.`;
    }

    Alert.alert(title, `Tranh chấp sẽ chuyển sang trạng thái ${statusLabels[status]}.`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xác nhận',
        style: status === 'REJECTED' || status === 'CLOSED' ? 'destructive' : 'default',
        onPress: () => statusMutation.mutate({ payload }),
      },
    ]);
  };

  const sendNote = () => {
    const content = note.trim();
    if (!content) {
      Alert.alert('Thiếu nội dung', 'Nhập ghi chú trước khi gửi.');
      return;
    }
    responseMutation.mutate({ content });
  };

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
          Chi tiết tranh chấp
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void disputeQuery.refetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {disputeQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : disputeQuery.isError || !disputeQuery.data ? (
        <EmptyState
          title="Không thể tải tranh chấp"
          description="Hồ sơ không tồn tại hoặc tài khoản không có quyền xem."
          buttonText="Quay lại"
          onPress={() => router.back()}
        />
      ) : (
        <DisputeDetail
          dispute={disputeQuery.data}
          isUpdating={statusMutation.isPending || responseMutation.isPending}
          note={note}
          onNoteChange={setNote}
          onSendNote={sendNote}
          onMarkReview={() => confirmStatus('UNDER_REVIEW', 'Nhận xử lý tranh chấp?')}
          onWaitResponse={() => confirmStatus('WAITING_RESPONSE', 'Yêu cầu hai bên phản hồi?')}
          onResolve={() => confirmStatus('RESOLVED', 'Đánh dấu đã giải quyết?')}
          onReject={() => confirmStatus('REJECTED', 'Từ chối tranh chấp?')}
          onClose={() => confirmStatus('CLOSED', 'Đóng tranh chấp?')}
        />
      )}
    </SafeAreaView>
  );
}

function DisputeDetail({
  dispute,
  isUpdating,
  note,
  onNoteChange,
  onSendNote,
  onMarkReview,
  onWaitResponse,
  onResolve,
  onReject,
  onClose,
}: {
  dispute: AdminDispute;
  isUpdating: boolean;
  note: string;
  onNoteChange: (value: string) => void;
  onSendNote: () => void;
  onMarkReview: () => void;
  onWaitResponse: () => void;
  onResolve: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const disabled = isUpdating || isTerminal(dispute.status);

  return (
    <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <View className="rounded-2xl border border-border bg-surface p-4">
        <View className="flex-row items-start justify-between">
          <View className="min-w-0 flex-1 pr-3">
            <Text className="text-xl font-extrabold text-text-primary">
              {dispute.rental.asset.title}
            </Text>
            <Text className="mt-2 leading-6 text-text-secondary">{dispute.description}</Text>
          </View>
          <StatusBadge status={dispute.status} />
        </View>

        <View className="mt-4 rounded-xl bg-surface-secondary p-3">
          <InfoLine icon={AlertCircle} label="Lý do" value={dispute.reason} />
          <InfoLine icon={Clock3} label="Tạo lúc" value={formatDate(dispute.createdAt)} />
          <InfoLine icon={Clock3} label="Cập nhật" value={formatDate(dispute.updatedAt)} />
          <InfoLine icon={FileText} label="Mã đơn" value={dispute.rentalId} />
        </View>
      </View>

      <Section title="Các bên liên quan">
        <PartyLine label="Người mở" user={dispute.openedBy} />
        <PartyLine label="Chủ tài sản" user={dispute.rental.owner} />
        <PartyLine label="Người thuê" user={dispute.rental.renter} />
        <PartyLine label="Phụ trách" user={dispute.assignedTo ?? undefined} fallback="Chưa phân công" />
      </Section>

      <Section title="Trạng thái đơn thuê">
        <InfoLine icon={FileText} label="Rental" value={dispute.rental.status} />
        <InfoLine icon={Clock3} label="Bắt đầu" value={formatDate(dispute.rental.startAt)} />
        <InfoLine icon={Clock3} label="Kết thúc" value={formatDate(dispute.rental.endAt)} />
        <InfoLine icon={FileText} label="Payout" value={dispute.rental.payout?.status ?? 'Không có'} />
        {dispute.rental.handovers?.map((handover) => (
          <InfoLine
            key={handover.id}
            icon={CheckCircle2}
            label={handover.type}
            value={`${handover.status} - ${formatDate(handover.confirmedAt ?? handover.createdAt)}`}
          />
        ))}
      </Section>

      <Section title="Bằng chứng">
        {dispute.evidences.length > 0 ? (
          dispute.evidences.map((item) => (
            <EvidenceCard key={item.id} item={item} />
          ))
        ) : (
          <Text className="text-text-secondary">Chưa có bằng chứng đính kèm.</Text>
        )}
      </Section>

      <Section title="Timeline">
        {dispute.events.map((event) => (
          <View key={event.id} className="mb-3 rounded-xl border border-border p-3">
            <View className="mb-1 flex-row items-center justify-between">
              <Text className="font-extrabold text-text-primary">{event.eventType}</Text>
              <Text className="text-xs font-bold text-text-secondary">
                {formatDate(event.createdAt)}
              </Text>
            </View>
            <Text className="leading-5 text-text-secondary">{event.content}</Text>
            {event.actor ? (
              <Text className="mt-2 text-xs font-bold text-primary">{event.actor.fullName}</Text>
            ) : null}
          </View>
        ))}
      </Section>

      <Section title="Xử lý">
        {dispute.resolutionSummary ? (
          <View className="mb-3 rounded-xl bg-success/10 p-3">
            <Text className="font-extrabold text-success">Kết luận</Text>
            <Text className="mt-1 leading-5 text-text-secondary">{dispute.resolutionSummary}</Text>
          </View>
        ) : null}
        <TextInput
          className="min-h-24 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
          editable={!isUpdating}
          multiline
          onChangeText={onNoteChange}
          placeholder="Ghi chú xử lý hoặc kết luận"
          placeholderTextColor={colors.text.muted}
          textAlignVertical="top"
          value={note}
        />
        <TouchableOpacity
          className="mt-3 min-h-12 flex-row items-center justify-center rounded-xl border border-primary/25 bg-primary-soft"
          disabled={isUpdating || isTerminal(dispute.status)}
          onPress={onSendNote}
        >
          {isUpdating ? (
            <ActivityIndicator color={colors.primary.DEFAULT} />
          ) : (
            <>
              <MessageSquareText size={18} color={colors.primary.DEFAULT} />
              <Text className="ml-2 font-extrabold text-primary">Gửi ghi chú</Text>
            </>
          )}
        </TouchableOpacity>

        <View className="mt-3 flex-row flex-wrap gap-3">
          <ActionButton label="Đang xử lý" tone="warning" disabled={disabled} onPress={onMarkReview} />
          <ActionButton label="Chờ phản hồi" tone="primary" disabled={disabled} onPress={onWaitResponse} />
          <ActionButton label="Giải quyết" tone="success" disabled={disabled} onPress={onResolve} />
          <ActionButton label="Từ chối" tone="danger" disabled={disabled} onPress={onReject} />
          <ActionButton label="Đóng" tone="muted" disabled={disabled} onPress={onClose} />
        </View>
      </Section>
    </ScrollView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mt-4 rounded-2xl border border-border bg-surface p-4">
      <Text className="mb-3 text-xs font-extrabold uppercase text-text-secondary">{title}</Text>
      {children}
    </View>
  );
}

function StatusBadge({ status }: { status: AdminDisputeStatus }) {
  const label = statusLabels[status];

  if (status === 'RESOLVED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (status === 'REJECTED' || status === 'CLOSED') {
    return (
      <View className="rounded-full bg-gray-100 px-3 py-1">
        <Text className="text-xs font-extrabold text-text-secondary">{label}</Text>
      </View>
    );
  }

  if (status === 'UNDER_REVIEW') {
    return (
      <View className="rounded-full bg-warning/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-warning">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-danger/10 px-3 py-1">
      <Text className="text-xs font-extrabold text-danger">{label}</Text>
    </View>
  );
}

function PartyLine({
  label,
  user,
  fallback,
}: {
  label: string;
  user?: { fullName: string; email?: string | null };
  fallback?: string;
}) {
  return (
    <View className="mb-3 flex-row items-center rounded-xl bg-surface-secondary p-3">
      <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-primary-soft">
        <UserRound size={19} color={colors.primary.DEFAULT} />
      </View>
      <View className="min-w-0 flex-1">
        <Text className="text-xs font-bold uppercase text-text-secondary">{label}</Text>
        <Text className="mt-0.5 font-extrabold text-text-primary">
          {user?.fullName ?? fallback ?? 'Không rõ'}
        </Text>
        {user?.email ? <Text className="text-sm text-text-secondary">{user.email}</Text> : null}
      </View>
    </View>
  );
}

function EvidenceCard({
  item,
}: {
  item: AdminDispute['evidences'][number];
}) {
  const isImage = item.evidence.type === 'IMAGE' || /\.(png|jpe?g|webp)$/i.test(item.evidence.fileUrl);
  const openFile = () => {
    void Linking.openURL(item.evidence.fileUrl);
  };

  return (
    <TouchableOpacity className="mb-3 overflow-hidden rounded-xl border border-border" onPress={openFile}>
      {isImage ? (
        <Image source={{ uri: item.evidence.fileUrl }} style={{ height: 160, width: '100%' }} contentFit="cover" />
      ) : (
        <View className="h-28 items-center justify-center bg-surface-secondary">
          <ImageIcon size={32} color={colors.text.muted} />
        </View>
      )}
      <View className="p-3">
        <Text className="font-extrabold text-text-primary">{item.evidence.type}</Text>
        <Text className="mt-1 text-sm text-text-secondary">
          {item.uploadedBy.fullName} - {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof FileText;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-1">
      <Icon size={15} color={colors.text.secondary} />
      <Text className="ml-2 mr-3 text-sm text-text-secondary">{label}</Text>
      <Text className="min-w-0 flex-1 text-right text-sm font-bold text-text-primary" numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({
  label,
  tone,
  disabled,
  onPress,
}: {
  label: string;
  tone: 'primary' | 'warning' | 'success' | 'danger' | 'muted';
  disabled: boolean;
  onPress: () => void;
}) {
  const base = 'min-h-12 w-[47%] items-center justify-center rounded-xl px-3';

  if (tone === 'success') {
    return (
      <TouchableOpacity className={`${base} bg-success ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}>
        <Text className="font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  if (tone === 'danger') {
    return (
      <TouchableOpacity className={`${base} bg-danger ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}>
        <Text className="font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  if (tone === 'warning') {
    return (
      <TouchableOpacity className={`${base} bg-warning ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}>
        <Text className="font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  if (tone === 'muted') {
    return (
      <TouchableOpacity className={`${base} bg-gray-500 ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}>
        <Text className="font-extrabold text-white">{label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity className={`${base} bg-primary ${disabled ? 'opacity-50' : ''}`} disabled={disabled} onPress={onPress}>
      <Text className="font-extrabold text-white">{label}</Text>
    </TouchableOpacity>
  );
}
