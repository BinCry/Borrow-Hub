import { apiClient } from '../api/client';
import { Rental, Paginated } from '../../types/domain';
import { ENV } from '../../utils/env';
import { mockRentals } from '../../mocks/fixtures';

export const RentalsService = {
  async getMyRentals(role: 'renter' | 'owner'): Promise<Paginated<Rental>> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 800));
      const all = Object.values(mockRentals);
      return {
        data: all,
        meta: {
          total: all.length,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
        }
      };
    }

    const response = await apiClient.get<Paginated<Rental>>(`/rentals/my`, { params: { role } });
    return response.data;
  },

  async getById(id: string): Promise<Rental> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const r = mockRentals[id];
      if (!r) throw new Error('Rental not found');
      return r;
    }

    const response = await apiClient.get<Rental>(`/rentals/${id}`);
    return response.data;
  },

  async create(payload: any): Promise<Rental> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 800));
      // Just return mock data to simulate success
      return Object.values(mockRentals)[0];
    }
    const response = await apiClient.post<Rental>('/rentals', payload);
    return response.data;
  },

  async approve(id: string): Promise<Rental> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return { ...mockRentals[id], status: 'APPROVED' };
    }
    const response = await apiClient.patch<Rental>(`/rentals/${id}/approve`);
    return response.data;
  },
  
  async decline(id: string, reason: string): Promise<Rental> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 600));
      return { ...mockRentals[id], status: 'CANCELLED' };
    }
    const response = await apiClient.patch<Rental>(`/rentals/${id}/decline`, { reason });
    return response.data;
  }
};
