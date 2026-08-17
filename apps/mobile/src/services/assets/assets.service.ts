import { apiClient } from '../api/client';
import { Asset, Paginated } from '../../types/domain';
import { ENV } from '../../utils/env';
import { mockAssets } from '../../mocks/fixtures';

export interface AssetSearchFilters {
  query?: string;
  categoryId?: string;
  condition?: string;
  minPrice?: number;
  maxPrice?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  page?: number;
  limit?: number;
}

export const AssetsService = {
  async search(filters: AssetSearchFilters): Promise<Paginated<Asset>> {
    if (ENV.USE_MOCKS) {
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 800));
      const allAssets = Object.values(mockAssets);
      let filtered = allAssets;
      
      if (filters.query) {
        filtered = filtered.filter(a => a.title.toLowerCase().includes(filters.query!.toLowerCase()));
      }
      
      return {
        data: filtered,
        meta: {
          total: filtered.length,
          page: filters.page || 1,
          limit: filters.limit || 10,
          totalPages: 1,
          hasNextPage: false,
        }
      };
    }

    // Call actual backend API
    const response = await apiClient.get<Paginated<Asset>>('/assets', { params: filters });
    return response.data;
  },

  async getById(id: string): Promise<Asset> {
    if (ENV.USE_MOCKS) {
      await new Promise(resolve => setTimeout(resolve, 500));
      const asset = mockAssets[id];
      if (!asset) throw new Error('Asset not found');
      return asset;
    }

    const response = await apiClient.get<Asset>(`/assets/${id}`);
    return response.data;
  }
};
