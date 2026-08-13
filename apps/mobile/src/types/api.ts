export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string | null;
  status: string;
  trustScore: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface AssetImage {
  id: string;
  url: string;
  isCover: boolean;
}

export interface Asset {
  id: string;
  title: string;
  description: string;
  brand: string | null;
  model: string | null;
  condition: string;
  pricePerDay: number;
  city: string;
  district: string;
  status: string;
  ownerId: string;
  categoryId: string;
  images: AssetImage[];
  owner: User;
  rating?: number; // Might come from backend aggregations
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface RentalRequest {
  id: string;
  assetId: string;
  ownerId: string;
  renterId: string;
  startAt: string;
  endAt: string;
  rentalFee: number;
  serviceFee: number;
  deliveryFee: number;
  lateFee: number;
  totalAmount: number;
  status: string;
  asset: Asset;
  owner: User;
  renter: User;
}
