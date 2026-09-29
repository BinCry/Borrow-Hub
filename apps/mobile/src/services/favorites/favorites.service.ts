import { apiClient } from '../api/client';
import { Asset } from '../../types/domain';
import { mapAsset } from '../assets/assets.service';

export const FavoritesService = {
  async list(): Promise<Asset[]> {
    const response = await apiClient.get<Array<{ asset: Record<string, unknown> }>>('/favorites');
    return response.data
      .map((item) => item.asset)
      .filter(Boolean)
      .map((asset) => mapAsset(asset as never));
  },

  async remove(assetId: string) {
    await apiClient.delete(`/favorites/assets/${assetId}`);
  },
};
