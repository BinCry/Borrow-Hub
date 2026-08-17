import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AssetsService, AssetSearchFilters } from '../services';

export const useAssets = (filters: AssetSearchFilters) => {
  return useQuery({
    queryKey: ['assets', 'list', filters],
    queryFn: () => AssetsService.search(filters),
  });
};

export const useAsset = (id: string) => {
  return useQuery({
    queryKey: ['assets', 'detail', id],
    queryFn: () => AssetsService.getById(id),
    enabled: !!id,
  });
};
