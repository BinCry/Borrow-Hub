import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, LifeBuoy, MessageCircle, Plus, Send } from 'lucide-react-native';
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
import { apiClient } from '../services/api/client';
import { useAuthStore } from '../store/authStore';
import { colors } from '../theme/colors';

type SupportTicket = {
  id: string;
  subject: string;
  description: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  createdAt: string;
};

const statusLabels: Record<SupportTicket['status'], string> = {
  OPEN: 'Đã tiếp nhận',
  IN_PROGRESS: 'Đang xử lý',
  WAITING_USER: 'Chờ phản hồi',
  RESOLVED: 'Đã giải quyết',
  CLOSED: 'Đã đóng',
};

export default function SupportScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [showForm, setShowForm] = useState(false);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets'],
    queryFn: async () =>
      (await apiClient.get<SupportTicket[]>('/support/tickets')).data,
    enabled: isAuthenticated,
  });
  const createMutation = useMutation({
    mutationFn: () =>
      apiClient.post('/support/tickets', {
        subject: subject.trim(),
        description: description.trim(),
        priority: 'MEDIUM',
      }),
    onSuccess: () => {
      setSubject('');
      setDescription('');
      setShowForm(false);
      void queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      Alert.alert('Đã gửi yêu cầu', 'Đội ngũ hỗ trợ sẽ phản hồi ngay trên phiếu này.');
    },
    onError: () => {
      Alert.alert('Không thể gửi yêu cầu', 'Vui lòng kiểm tra kết nối và thử lại.');
    },
  });
  const canSubmit =
    subject.trim().length >= 5 &&
    description.trim().length >= 10 &&
    !createMutation.isPending;

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
        <Text className="flex-1 text-center text-lg font-bold text-text-primary">Hỗ trợ</Text>
        <TouchableOpacity
          accessibilityLabel="Tạo phiếu hỗ trợ"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => setShowForm((value) => !value)}
        >
          <Plus size={24} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {!isAuthenticated ? (
        <View className="flex-1 items-center justify-center px-6">
          <LifeBuoy size={64} color={colors.primary.DEFAULT} />
          <Text className="mt-5 text-xl font-bold text-text-primary">Đăng nhập để nhận hỗ trợ</Text>
          <Text className="mt-2 text-center leading-6 text-text-secondary">
            Phiếu hỗ trợ được liên kết với tài khoản để bảo vệ thông tin giao dịch.
          </Text>
          <TouchableOpacity
            className="mt-7 min-h-14 w-full items-center justify-center rounded-xl bg-primary"
            onPress={() => router.push('/auth/login')}
          >
            <Text className="text-lg font-bold text-white">Đăng nhập</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-6 items-center rounded-3xl bg-primary-soft p-6">
            <MessageCircle size={48} color={colors.primary.DEFAULT} />
            <Text className="mt-3 text-center text-xl font-extrabold text-text-primary">
              Chúng tôi có thể giúp gì?
            </Text>
            <Text className="mt-2 text-center leading-6 text-text-secondary">
              Mô tả rõ đơn thuê hoặc vấn đề bạn gặp để đội ngũ xử lý nhanh hơn.
            </Text>
          </View>

          {showForm ? (
            <View className="mb-6 rounded-2xl border border-border bg-surface p-5">
              <Text className="text-lg font-bold text-text-primary">Tạo phiếu hỗ trợ</Text>
              <TextInput
                className="mt-4 min-h-14 rounded-xl border border-border bg-surfaceSecondary px-4 text-text-primary"
                placeholder="Tiêu đề vấn đề"
                placeholderTextColor={colors.text.muted}
                value={subject}
                onChangeText={setSubject}
                maxLength={160}
              />
              <TextInput
                className="mt-3 min-h-32 rounded-xl border border-border bg-surfaceSecondary px-4 py-3 text-text-primary"
                placeholder="Mô tả chi tiết..."
                placeholderTextColor={colors.text.muted}
                value={description}
                onChangeText={setDescription}
                maxLength={4000}
                multiline
                textAlignVertical="top"
              />
              <TouchableOpacity
                className={`mt-4 min-h-12 flex-row items-center justify-center rounded-xl ${
                  canSubmit ? 'bg-primary' : 'bg-gray-300'
                }`}
                disabled={!canSubmit}
                onPress={() => createMutation.mutate()}
              >
                {createMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Send size={18} color="white" />
                    <Text className="ml-2 font-bold text-white">Gửi yêu cầu</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          ) : null}

          <Text className="mb-3 text-lg font-bold text-text-primary">Phiếu của bạn</Text>
          {ticketsQuery.isLoading ? (
            <ActivityIndicator className="mt-8" color={colors.primary.DEFAULT} />
          ) : ticketsQuery.isError ? (
            <TouchableOpacity
              className="min-h-12 items-center justify-center rounded-xl border border-danger"
              onPress={() => void ticketsQuery.refetch()}
            >
              <Text className="font-semibold text-danger">Không thể tải, nhấn để thử lại</Text>
            </TouchableOpacity>
          ) : (ticketsQuery.data ?? []).length === 0 ? (
            <View className="items-center rounded-2xl border border-border bg-surface p-8">
              <LifeBuoy size={36} color={colors.text.muted} />
              <Text className="mt-3 text-center text-text-secondary">Bạn chưa có phiếu hỗ trợ nào.</Text>
            </View>
          ) : (
            (ticketsQuery.data ?? []).map((ticket) => (
              <View key={ticket.id} className="mb-3 rounded-2xl border border-border bg-surface p-4">
                <View className="flex-row items-start justify-between">
                  <Text className="mr-3 flex-1 font-bold text-text-primary">{ticket.subject}</Text>
                  <View className="rounded-full bg-primary-soft px-3 py-1">
                    <Text className="text-xs font-bold text-primary">{statusLabels[ticket.status]}</Text>
                  </View>
                </View>
                <Text className="mt-2 text-sm leading-5 text-text-secondary" numberOfLines={2}>
                  {ticket.description}
                </Text>
                <Text className="mt-3 text-xs text-text-muted">
                  {new Date(ticket.createdAt).toLocaleDateString('vi-VN')}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
