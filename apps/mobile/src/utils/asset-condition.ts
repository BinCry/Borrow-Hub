import type { AssetCondition } from '../types/domain';

const conditionLabels: Record<AssetCondition, string> = {
  NEW: 'Mới',
  LIKE_NEW: 'Như mới',
  GOOD: 'Tốt',
  FAIR: 'Khá',
  WORN: 'Đã qua sử dụng',
};

export function getAssetConditionLabel(condition: string): string {
  return conditionLabels[condition as AssetCondition] ?? 'Chưa xác định';
}
