import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { BellRing, ChevronLeft, Megaphone, Send } from 'lucide-react-native';
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
import { AdminService } from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

const TITLE_LIMIT = 120;
const CONTENT_LIMIT = 2000;

export default function AdminAnnouncementsScreen() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const broadcastMutation = useMutation({
    mutationFn: AdminService.broadcastNotification,
    onSuccess: (result) => {
      setTitle('');
      setContent('');
      Alert.alert(
        'Đã gửi thông báo',
        `Thông báo đã được gửi đến ${result.recipientCount} người dùng.`,
      );
    },
    onError: () => {
      Alert.alert('Không thể gửi thông báo', 'Kiểm tra quyền admin hoặc thử lại sau.');
    },
  });

  const trimmedTitle = title.trim();
  const trimmedContent = content.trim();
  const canSubmit =
    trimmedTitle.length > 0 &&
    trimmedContent.length > 0 &&
    title.length <= TITLE_LIMIT &&
    content.length <= CONTENT_LIMIT &&
    !broadcastMutation.isPending;

  const confirmSend = () => {
    if (!canSubmit) {
      Alert.alert('Thiếu nội dung', 'Nhập tiêu đề và nội dung thông báo trước khi gửi.');
      return;
    }

    Alert.alert(
      'Gửi thông báo toàn hệ thống?',
      'Thông báo này sẽ xuất hiện trong hộp thông báo của toàn bộ người dùng đang hoạt động.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Gửi',
          onPress: () =>
            broadcastMutation.mutate({
              title: trimmedTitle,
              content: trimmedContent,
            }),
        },
      ],
    );
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
          Thông báo admin
        </Text>
        <View className="w-11" />
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-4 rounded-lg border border-primary/20 bg-surface p-4">
            <View className="flex-row items-start">
              <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
                <Megaphone size={24} color={colors.primary.DEFAULT} />
              </View>
              <View className="min-w-0 flex-1">
                <Text className="text-lg font-extrabold text-text-primary">
                  Tạo bài thông báo
                </Text>
                <Text className="mt-1 text-sm font-semibold leading-5 text-text-secondary">
                  Gửi thông báo chính thức với tư cách admin đến toàn bộ người dùng đang hoạt động.
                </Text>
              </View>
            </View>
          </View>

          <View className="rounded-lg border border-border bg-surface p-4">
            <Text className="mb-2 text-sm font-extrabold text-text-primary">Tiêu đề</Text>
            <TextInput
              className="min-h-12 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
              maxLength={TITLE_LIMIT}
              onChangeText={setTitle}
              placeholder="Ví dụ: Bảo trì hệ thống tối nay"
              placeholderTextColor={colors.text.muted}
              value={title}
            />
            <Text className="mt-2 text-right text-xs font-semibold text-text-muted">
              {title.length}/{TITLE_LIMIT}
            </Text>

            <Text className="mb-2 mt-4 text-sm font-extrabold text-text-primary">
              Nội dung
            </Text>
            <TextInput
              className="min-h-44 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
              maxLength={CONTENT_LIMIT}
              multiline
              onChangeText={setContent}
              placeholder="Nhập nội dung thông báo gửi đến người dùng..."
              placeholderTextColor={colors.text.muted}
              textAlignVertical="top"
              value={content}
            />
            <Text className="mt-2 text-right text-xs font-semibold text-text-muted">
              {content.length}/{CONTENT_LIMIT}
            </Text>
          </View>

          <View className="mt-4 rounded-lg border border-border bg-surface p-4">
            <View className="mb-3 flex-row items-center">
              <BellRing size={20} color={colors.primary.DEFAULT} />
              <Text className="ml-2 text-sm font-extrabold uppercase text-text-secondary">
                Xem trước
              </Text>
            </View>
            <Text className="text-base font-extrabold text-text-primary">
              {trimmedTitle || 'Tiêu đề thông báo'}
            </Text>
            <Text className="mt-2 leading-5 text-text-secondary">
              {trimmedContent || 'Nội dung thông báo sẽ hiển thị tại đây.'}
            </Text>
          </View>

          <TouchableOpacity
            className={`mt-5 min-h-14 flex-row items-center justify-center rounded-xl ${
              canSubmit ? 'bg-primary' : 'bg-gray-300'
            }`}
            disabled={!canSubmit}
            onPress={confirmSend}
          >
            {broadcastMutation.isPending ? (
              <ActivityIndicator color="white" />
            ) : (
              <>
                <Send size={19} color="white" />
                <Text className="ml-2 text-lg font-extrabold text-white">
                  Gửi toàn bộ người dùng
                </Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
