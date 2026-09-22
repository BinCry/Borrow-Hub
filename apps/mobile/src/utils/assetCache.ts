import type { QueryClient } from '@tanstack/react-query';
import type { AdminAssetList } from '../services/admin/admin.service';
import type { Asset, Paginated } from '../types/domain';

function decrement(value: number, removed: boolean) {
  return removed ? Math.max(0, value - 1) : value;
}

function totalPages(total: number, limit: number) {
  return total <= 0 ? 0 : Math.ceil(total / limit);
}

export function removeAssetFromListCaches(queryClient: QueryClient, assetId: string) {
  queryClient.setQueriesData<Paginated<Asset>>(
    { queryKey: ['assets', 'list'] },
    (previous) => {
      if (!previous) {
        return previous;
      }

      const data = previous.data.filter((asset) => asset.id !== assetId);
      const removed = data.length !== previous.data.length;
      const total = decrement(previous.meta.total, removed);
      const pages = totalPages(total, previous.meta.limit);

      return {
        ...previous,
        data,
        meta: {
          ...previous.meta,
          total,
          totalPages: pages,
          hasNextPage: previous.meta.page < pages,
        },
      };
    },
  );

  queryClient.setQueriesData<AdminAssetList>(
    { queryKey: ['admin', 'listings'] },
    (previous) => {
      if (!previous) {
        return previous;
      }

      const data = previous.data.filter((asset) => asset.id !== assetId);
      const removed = data.length !== previous.data.length;
      const total = decrement(previous.pagination.total, removed);
      const pages = totalPages(total, previous.pagination.limit);

      return {
        ...previous,
        data,
        pagination: {
          ...previous.pagination,
          total,
          totalPages: pages,
        },
      };
    },
  );

  queryClient.setQueryData<Asset[]>(['my-assets'], (previous) =>
    previous?.filter((asset) => asset.id !== assetId),
  );
}
