import { apiClient } from '../api/client';
import { Asset, AssetCondition, AssetStatus, DeliveryMethod, Paginated, User } from '../../types/domain';

export interface AssetSearchFilters {
  keyword?: string;
  categoryId?: string;
  city?: string;
  district?: string;
  condition?: AssetCondition;
  deliveryMethod?: DeliveryMethod;
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  latitude?: number;
  longitude?: number;
  radiusKm?: number;
  startAt?: string;
  endAt?: string;
  sort?: 'newest' | 'lowest-price' | 'highest-price' | 'nearest' | 'highest-rating' | 'most-rented';
  page?: number;
  limit?: number;
}

type ApiUser = Partial<User> & Pick<User, 'id' | 'fullName'>;

type ApiAsset = {
  id: string;
  title: string;
  description?: string;
  brand?: string | null;
  model?: string | null;
  condition: AssetCondition;
  pricePerDay: number;
  city: string;
  district: string;
  latitude?: number | null;
  longitude?: number | null;
  distanceKm?: number | null;
  status: AssetStatus;
  ownerId: string;
  categoryId?: string;
  images?: { id: string; url: string; isCover?: boolean }[];
  owner?: ApiUser;
  ownerAverageRating?: number;
  reviewCount?: number;
  completedRentalCount?: number;
  deliveryOptions?: unknown;
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  isFavorite?: boolean;
};

type ApiAssetList = {
  data: ApiAsset[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
};

function mapDeliveryMethods(value: unknown): DeliveryMethod[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(
    (item): item is DeliveryMethod =>
      item === 'PICKUP' || item === 'DELIVERY' || item === 'BOTH',
  );
}

export function mapAsset(asset: ApiAsset): Asset {
  return {
    id: asset.id,
    title: asset.title,
    description: asset.description ?? '',
    brand: asset.brand ?? null,
    model: asset.model ?? null,
    condition: asset.condition,
    pricePerDay: asset.pricePerDay,
    location: {
      city: asset.city,
      district: asset.district,
      ...(asset.latitude == null ? {} : { latitude: asset.latitude }),
      ...(asset.longitude == null ? {} : { longitude: asset.longitude }),
      ...(asset.distanceKm == null
        ? {}
        : { approximateDistanceKm: asset.distanceKm }),
    },
    status: asset.status,
    ownerId: asset.ownerId,
    categoryId: asset.categoryId,
    images: (asset.images ?? []).map((image) => ({
      id: image.id,
      url: image.url,
      isCover: image.isCover ?? false,
    })),
    owner: asset.owner,
    rating: asset.ownerAverageRating ?? 0,
    reviewCount: asset.reviewCount ?? 0,
    completedRentalCount: asset.completedRentalCount ?? 0,
    deliveryMethods: mapDeliveryMethods(asset.deliveryOptions),
    minimumDurationDays: asset.minimumDurationDays,
    maximumDurationDays: asset.maximumDurationDays,
    isFavorite: asset.isFavorite,
  };
}

export const AssetsService = {
  async search(filters: AssetSearchFilters): Promise<Paginated<Asset>> {
    const response = await apiClient.get<ApiAssetList>('/assets', {
      params: filters,
    });
    const { pagination } = response.data;

    return {
      data: response.data.data.map(mapAsset),
      meta: {
        ...pagination,
        hasNextPage: pagination.page < pagination.totalPages,
      },
    };
  },

  async getById(id: string): Promise<Asset> {
    const response = await apiClient.get<ApiAsset>(`/assets/${id}`);
    return mapAsset(response.data);
  },

  async listMine(): Promise<Asset[]> {
    const response = await apiClient.get<ApiAsset[]>('/assets/my');
    return response.data.map(mapAsset);
  },
};
