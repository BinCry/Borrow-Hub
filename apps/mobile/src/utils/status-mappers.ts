import { RentalStatus, AssetStatus } from '../types/domain';
import { colors } from '../theme/colors';

export interface StatusPresentation {
  label: string;
  tone: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  colorHex: string;
}

export const getRentalStatusPresentation = (status: RentalStatus, isOwner: boolean = false): StatusPresentation => {
  switch (status) {
    case 'PENDING_OWNER':
      return {
        label: isOwner ? 'Cần duyệt' : 'Chờ duyệt',
        tone: 'warning',
        colorHex: colors.warning,
      };
    case 'APPROVED':
      return {
        label: 'Đã chấp nhận',
        tone: 'success',
        colorHex: colors.success,
      };
    case 'AWAITING_PAYMENT':
      return {
        label: 'Chờ thanh toán',
        tone: 'warning',
        colorHex: colors.warning,
      };
    case 'AWAITING_SIGNATURE':
      return {
        label: 'Chờ ký HĐ',
        tone: 'info',
        colorHex: colors.info,
      };
    case 'READY_FOR_HANDOVER':
      return {
        label: 'Sẵn sàng giao',
        tone: 'info',
        colorHex: colors.info,
      };
    case 'ONGOING':
      return {
        label: 'Đang thuê',
        tone: 'primary',
        colorHex: colors.primary.DEFAULT,
      };
    case 'RETURNED':
      return {
        label: 'Chờ hoàn tất',
        tone: 'info',
        colorHex: colors.info,
      };
    case 'COMPLETED':
      return {
        label: 'Hoàn tất',
        tone: 'success',
        colorHex: colors.success,
      };
    case 'CANCELLED':
      return {
        label: 'Đã huỷ',
        tone: 'danger',
        colorHex: colors.danger,
      };
    case 'DISPUTED':
      return {
        label: 'Khiếu nại',
        tone: 'danger',
        colorHex: colors.danger,
      };
    default:
      return {
        label: 'Không xác định',
        tone: 'neutral',
        colorHex: colors.text.muted,
      };
  }
};

export const getAssetStatusPresentation = (status: AssetStatus): StatusPresentation => {
  switch (status) {
    case 'AVAILABLE':
      return { label: 'Có sẵn', tone: 'success', colorHex: colors.success };
    case 'UNAVAILABLE':
      return { label: 'Bận', tone: 'warning', colorHex: colors.warning };
    case 'RENTED':
      return { label: 'Đang cho thuê', tone: 'info', colorHex: colors.info };
    case 'HIDDEN':
      return { label: 'Đã ẩn', tone: 'neutral', colorHex: colors.text.muted };
    default:
      return { label: 'Không xác định', tone: 'neutral', colorHex: colors.text.muted };
  }
};
