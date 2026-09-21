import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ban, ChevronLeft, PlusCircle, RefreshCcw, ShieldCheck, UserCheck } from 'lucide-react-native';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AdminService,
  AdminUser,
  AdminUserStatus,
} from '../../services/admin/admin.service';
import { apiClient } from '../../services/api/client';
import { colors } from '../../theme/colors';
import type { User } from '../../types/domain';

function getRoles(user: AdminUser) {
  return user.userRoles.map((userRole) => userRole.role.name);
}

function getPrimaryRole(user: AdminUser) {
  const roles = getRoles(user);
  if (roles.includes('SUPER_ADMIN')) {
    return 'SUPER_ADMIN';
  }
  if (roles.includes('ADMIN')) {
    return 'ADMIN';
  }
  return roles[0] ?? 'USER';
}

function getVerificationLabel(user: AdminUser) {
  return user.verification?.verificationStatus === 'VERIFIED' ? 'Đã KYC' : 'Chưa KYC';
}

function isSuperAdmin(user?: User) {
  return user?.roles?.includes('SUPER_ADMIN') ?? false;
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [statusReason, setStatusReason] = useState('');
  const [pendingStatusUser, setPendingStatusUser] = useState<AdminUser | null>(null);
  const meQuery = useQuery({
    queryKey: ['me'],
    queryFn: async () => (await apiClient.get<User>('/auth/me')).data,
  });
  const usersQuery = useQuery({
    queryKey: ['admin', 'users'],
    queryFn: AdminService.listUsers,
  });
  const statusMutation = useMutation({
    mutationFn: ({
      userId,
      status,
      reason,
    }: {
      userId: string;
      status: AdminUserStatus;
      reason?: string;
    }) => AdminService.updateUserStatus(userId, { status, reason }),
    onSuccess: () => {
      setPendingStatusUser(null);
      setStatusReason('');
      void queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể cập nhật', 'Kiểm tra quyền tài khoản rồi thử lại.');
    },
  });

  const confirmStatusChange = (user: AdminUser) => {
    const nextStatus: AdminUserStatus = user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';

    if (nextStatus === 'SUSPENDED') {
      setPendingStatusUser(user);
      setStatusReason('');
      return;
    }

    Alert.alert(
      nextStatus === 'ACTIVE' ? 'Mở lại tài khoản?' : 'Khóa tài khoản?',
      `${user.fullName} sẽ được chuyển sang trạng thái ${nextStatus}.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: nextStatus === 'ACTIVE' ? 'Mở lại' : 'Khóa',
          style: nextStatus === 'ACTIVE' ? 'default' : 'destructive',
          onPress: () => statusMutation.mutate({ userId: user.id, status: nextStatus }),
        },
      ],
    );
  };

  const submitSuspension = () => {
    const reason = statusReason.trim();

    if (!pendingStatusUser) {
      return;
    }

    if (!reason) {
      Alert.alert('Cần lý do đình chỉ', 'Nhập lý do để người dùng biết vì sao tài khoản bị đình chỉ.');
      return;
    }

    statusMutation.mutate({
      userId: pendingStatusUser.id,
      status: 'SUSPENDED',
      reason,
    });
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
          Người dùng
        </Text>
        {isSuperAdmin(meQuery.data) ? (
          <TouchableOpacity
            accessibilityLabel="Tạo nhân sự"
            className="min-h-11 min-w-11 items-center justify-center rounded-full"
            onPress={() => router.push('/admin/create-user' as any)}
          >
            <PlusCircle size={24} color={colors.primary.DEFAULT} />
          </TouchableOpacity>
        ) : (
          <View className="w-11" />
        )}
      </View>

      {usersQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : usersQuery.isError ? (
        <EmptyState
          title="Không thể tải người dùng"
          description="Kiểm tra kết nối hoặc quyền quản trị rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void usersQuery.refetch()}
        />
      ) : (
        <FlatList
          data={usersQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={usersQuery.isRefetching}
              onRefresh={() => void usersQuery.refetch()}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="Chưa có người dùng"
              description="Danh sách người dùng sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void usersQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isUpdating={statusMutation.isPending}
              onToggleStatus={() => confirmStatusChange(item)}
            />
          )}
        />
      )}
      <Modal
        animationType="fade"
        transparent
        visible={pendingStatusUser !== null}
        onRequestClose={() => {
          setPendingStatusUser(null);
          setStatusReason('');
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1 justify-end bg-black/40"
        >
          <View className="rounded-t-3xl bg-surface px-5 pb-6 pt-5">
            <Text className="text-lg font-extrabold text-text-primary">Khóa tài khoản?</Text>
            <Text className="mt-2 text-sm leading-5 text-text-secondary">
              {pendingStatusUser?.fullName} sẽ không thể đăng nhập cho đến khi được mở lại.
            </Text>
            <TextInput
              className="mt-4 min-h-24 rounded-xl border border-border bg-background px-4 py-3 text-text-primary"
              multiline
              onChangeText={setStatusReason}
              placeholder="Lý do đình chỉ"
              placeholderTextColor={colors.text.muted}
              textAlignVertical="top"
              value={statusReason}
            />
            <View className="mt-4 flex-row gap-3">
              <TouchableOpacity
                className="min-h-12 flex-1 items-center justify-center rounded-xl border border-border bg-surface"
                disabled={statusMutation.isPending}
                onPress={() => {
                  setPendingStatusUser(null);
                  setStatusReason('');
                }}
              >
                <Text className="font-bold text-text-secondary">Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="min-h-12 flex-1 items-center justify-center rounded-xl bg-danger"
                disabled={statusMutation.isPending}
                onPress={submitSuspension}
              >
                {statusMutation.isPending ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="font-extrabold text-white">Khóa</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

function UserRow({
  user,
  isUpdating,
  onToggleStatus,
}: {
  user: AdminUser;
  isUpdating: boolean;
  onToggleStatus: () => void;
}) {
  const active = user.status === 'ACTIVE';
  const staff = getRoles(user).some((role) => role === 'ADMIN' || role === 'SUPER_ADMIN');

  return (
    <View className="mb-3 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row">
        <View className="mr-3 h-12 w-12 items-center justify-center rounded-full bg-primary-soft">
          {staff ? (
            <ShieldCheck size={23} color={colors.primary.DEFAULT} />
          ) : (
            <UserCheck size={23} color={colors.primary.DEFAULT} />
          )}
        </View>
        <View className="min-w-0 flex-1">
          <Text className="text-base font-extrabold text-text-primary">{user.fullName}</Text>
          <Text className="mt-0.5 text-sm text-text-secondary">{user.email}</Text>
          <View className="mt-3 flex-row flex-wrap gap-2">
            <Badge label={getPrimaryRole(user)} tone={staff ? 'primary' : 'muted'} />
            <Badge label={user.status} tone={active ? 'success' : 'danger'} />
            <Badge
              label={getVerificationLabel(user)}
              tone={user.verification?.verificationStatus === 'VERIFIED' ? 'success' : 'muted'}
            />
          </View>
          {user.statusReason ? (
            <Text className="mt-3 text-sm leading-5 text-danger">
              Lý do đình chỉ: {user.statusReason}
            </Text>
          ) : null}
        </View>
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-border pt-3">
        <View>
          <Text className="text-xs font-bold uppercase text-text-secondary">Điểm uy tín</Text>
          <Text className="mt-1 text-lg font-extrabold text-text-primary">{user.trustScore}</Text>
        </View>
        <TouchableOpacity
          className={`min-h-11 flex-row items-center justify-center rounded-xl px-4 ${
            active ? 'bg-danger/10' : 'bg-success/10'
          }`}
          disabled={isUpdating}
          onPress={onToggleStatus}
        >
          {isUpdating ? (
            <ActivityIndicator color={active ? colors.danger : colors.success} />
          ) : active ? (
            <>
              <Ban size={17} color={colors.danger} />
              <Text className="ml-2 font-bold text-danger">Khóa</Text>
            </>
          ) : (
            <>
              <RefreshCcw size={17} color={colors.success} />
              <Text className="ml-2 font-bold text-success">Mở lại</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Badge({ label, tone }: { label: string; tone: 'primary' | 'success' | 'danger' | 'muted' }) {
  if (tone === 'primary') {
    return (
      <View className="rounded-full bg-primary-soft px-3 py-1">
        <Text className="text-xs font-extrabold text-primary">{label}</Text>
      </View>
    );
  }

  if (tone === 'success') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">{label}</Text>
      </View>
    );
  }

  if (tone === 'danger') {
    return (
      <View className="rounded-full bg-danger/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-danger">{label}</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-gray-100 px-3 py-1">
      <Text className="text-xs font-extrabold text-text-secondary">{label}</Text>
    </View>
  );
}
