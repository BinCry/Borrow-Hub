import { AssetStatus, RentalStatus } from '../types/domain';
import { colors } from '../theme/colors';

export interface StatusPresentation {
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  colorHex: string;
}

export const getRentalStatusPresentation = (
  status: RentalStatus,
  isOwner = false,
): StatusPresentation => {
  switch (status) {
    case 'PENDING_OWNER':
      return {
        label: isOwner ? 'Cần duyệt' : 'Chờ duyệt',
        tone: 'warning',
        colorHex: colors.warning,
      };
    case 'APPROVED':
      return { label: 'Đã chấp nhận', tone: 'success', colorHex: colors.success };
    case 'AWAITING_PAYMENT':
      return { label: 'Chờ thanh toán', tone: 'warning', colorHex: colors.warning };
    case 'AWAITING_SIGNATURE':
      return { label: 'Chờ ký hợp đồng', tone: 'info', colorHex: colors.info };
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', tone: 'success', colorHex: colors.success };
    case 'READY_FOR_HANDOVER':
      return { label: 'Sẵn sàng bàn giao', tone: 'info', colorHex: colors.info };
    case 'ONGOING':
      return { label: 'Đang thuê', tone: 'primary', colorHex: colors.primary.DEFAULT };
    case 'RETURN_PENDING':
      return { label: 'Chờ nhận lại', tone: 'info', colorHex: colors.info };
    case 'OVERDUE':
      return { label: 'Quá hạn', tone: 'danger', colorHex: colors.danger };
    case 'COMPLETED':
      return { label: 'Hoàn tất', tone: 'success', colorHex: colors.success };
    case 'DECLINED':
      return { label: 'Đã từ chối', tone: 'danger', colorHex: colors.danger };
    case 'CANCELLED':
      return { label: 'Đã hủy', tone: 'danger', colorHex: colors.danger };
    case 'EXPIRED':
      return { label: 'Đã hết hạn', tone: 'neutral', colorHex: colors.text.muted };
    case 'DISPUTED':
      return { label: 'Đang tranh chấp', tone: 'danger', colorHex: colors.danger };
  }
};

export const getAssetStatusPresentation = (
  status: AssetStatus,
): StatusPresentation => {
  switch (status) {
    case 'ACTIVE':
      return { label: 'Đang hoạt động', tone: 'success', colorHex: colors.success };
    case 'PENDING_REVIEW':
      return { label: 'Chờ duyệt', tone: 'warning', colorHex: colors.warning };
    case 'PAUSED':
      return { label: 'Tạm dừng', tone: 'warning', colorHex: colors.warning };
    case 'REJECTED':
      return { label: 'Bị từ chối', tone: 'danger', colorHex: colors.danger };
    case 'SUSPENDED':
      return { label: 'Bị khóa', tone: 'danger', colorHex: colors.danger };
    case 'ARCHIVED':
      return { label: 'Đã lưu trữ', tone: 'neutral', colorHex: colors.text.muted };
    case 'DRAFT':
      return { label: 'Bản nháp', tone: 'neutral', colorHex: colors.text.muted };
  }
};
