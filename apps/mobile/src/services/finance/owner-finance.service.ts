import { apiClient } from '../api/client';

export type OwnerPayout = {
  id: string;
  rentalId: string;
  ownerId: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: 'PENDING' | 'SCHEDULED' | 'PAID' | 'BLOCKED' | 'CANCELLED';
  paidAt?: string | null;
  scheduledAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;
  rental: {
    asset: { id: string; title: string };
  };
};

export const OwnerFinanceService = {
  async listMyPayouts(): Promise<OwnerPayout[]> {
    const response = await apiClient.get<OwnerPayout[]>('/finance/payouts/my', {
      params: { scope: 'owner' },
    });
    return response.data;
  },
};
