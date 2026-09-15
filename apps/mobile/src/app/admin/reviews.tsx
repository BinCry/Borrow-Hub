import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { ChevronLeft, EyeOff, RefreshCcw, Star } from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState } from '../../components/ui/EmptyState';
import {
  AdminReview,
  AdminReviewStatus,
  AdminService,
} from '../../services/admin/admin.service';
import { colors } from '../../theme/colors';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function AdminReviewsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const reviewsQuery = useQuery({
    queryKey: ['admin', 'reviews'],
    queryFn: AdminService.listReviews,
  });
  const mutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: AdminReviewStatus }) =>
      AdminService.moderateReview(reviewId, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'reviews'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'queue-counts'] });
      void queryClient.invalidateQueries({ queryKey: ['admin', 'dashboard'] });
    },
    onError: () => {
      Alert.alert('Không thể kiểm duyệt', 'Kiểm tra quyền moderator rồi thử lại.');
    },
  });

  const confirmModerate = (review: AdminReview) => {
    const nextStatus: AdminReviewStatus = review.status === 'PUBLISHED' ? 'HIDDEN' : 'PUBLISHED';
    Alert.alert(
      nextStatus === 'HIDDEN' ? 'Ẩn review?' : 'Hiện lại review?',
      `Review ${review.rating} sao sẽ chuyển sang trạng thái ${nextStatus}.`,
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: nextStatus === 'HIDDEN' ? 'Ẩn' : 'Hiện lại',
          style: nextStatus === 'HIDDEN' ? 'destructive' : 'default',
          onPress: () => mutation.mutate({ reviewId: review.id, status: nextStatus }),
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
          Kiểm duyệt review
        </Text>
        <TouchableOpacity
          accessibilityLabel="Tải lại"
          className="min-h-11 min-w-11 items-center justify-center rounded-full"
          onPress={() => void reviewsQuery.refetch()}
        >
          <RefreshCcw size={22} color={colors.primary.DEFAULT} />
        </TouchableOpacity>
      </View>

      {reviewsQuery.isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary.DEFAULT} />
        </View>
      ) : reviewsQuery.isError ? (
        <EmptyState
          title="Không thể tải review"
          description="Kiểm tra kết nối hoặc quyền kiểm duyệt rồi thử lại."
          buttonText="Thử lại"
          onPress={() => void reviewsQuery.refetch()}
        />
      ) : (
        <FlatList
          data={reviewsQuery.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={reviewsQuery.isRefetching}
              onRefresh={() => void reviewsQuery.refetch()}
            />
          }
          ListHeaderComponent={
            <Text className="mb-3 text-sm font-bold text-text-secondary">
              {reviewsQuery.data?.length ?? 0} review
            </Text>
          }
          ListEmptyComponent={
            <EmptyState
              title="Chưa có review"
              description="Review của người dùng sẽ xuất hiện tại đây."
              buttonText="Tải lại"
              onPress={() => void reviewsQuery.refetch()}
            />
          }
          renderItem={({ item }) => (
            <ReviewCard
              review={item}
              isUpdating={mutation.isPending}
              onModerate={() => confirmModerate(item)}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}

function ReviewCard({
  review,
  isUpdating,
  onModerate,
}: {
  review: AdminReview;
  isUpdating: boolean;
  onModerate: () => void;
}) {
  const hidden = review.status === 'HIDDEN';

  return (
    <View className="mb-4 rounded-2xl border border-border bg-surface p-4">
      <View className="flex-row items-start justify-between">
        <View className="min-w-0 flex-1 pr-3">
          <View className="flex-row items-center">
            {Array.from({ length: 5 }).map((_, index) => (
              <Star
                key={index}
                size={17}
                color={index < review.rating ? colors.warning : colors.border}
                fill={index < review.rating ? colors.warning : 'transparent'}
              />
            ))}
          </View>
          <Text className="mt-3 text-base font-extrabold text-text-primary">
            {review.reviewer?.fullName ?? 'Người đánh giá'} → {review.reviewee?.fullName ?? 'Người nhận'}
          </Text>
          <Text className="mt-1 text-sm text-text-secondary">Rental: {review.rentalId}</Text>
        </View>
        <StatusBadge status={review.status} />
      </View>

      <Text className="mt-4 leading-6 text-text-secondary">
        {review.comment?.trim() || 'Không có bình luận.'}
      </Text>
      <Text className="mt-3 text-xs font-bold text-text-secondary">
        {formatDate(review.createdAt)}
      </Text>

      <TouchableOpacity
        className={`mt-4 min-h-12 flex-row items-center justify-center rounded-xl ${
          hidden ? 'bg-primary' : 'bg-danger'
        }`}
        disabled={isUpdating}
        onPress={onModerate}
      >
        {isUpdating ? (
          <ActivityIndicator color="white" />
        ) : (
          <>
            <EyeOff size={18} color="white" />
            <Text className="ml-2 font-extrabold text-white">
              {hidden ? 'Hiện lại review' : 'Ẩn review'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function StatusBadge({ status }: { status: AdminReviewStatus }) {
  if (status === 'PUBLISHED') {
    return (
      <View className="rounded-full bg-success/10 px-3 py-1">
        <Text className="text-xs font-extrabold text-success">Đang hiện</Text>
      </View>
    );
  }

  return (
    <View className="rounded-full bg-danger/10 px-3 py-1">
      <Text className="text-xs font-extrabold text-danger">Đã ẩn</Text>
    </View>
  );
}
