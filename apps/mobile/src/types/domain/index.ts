/**
 * Domain Models for the UI Layer
 * These models are used throughout the UI components. They are decoupled from the exact backend DTOs.
 * A mapping layer (Service/Adapter) should convert backend DTOs into these Domain Models.
 */

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'UNVERIFIED';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  avatarUrl: string | null;
  status: UserStatus;
  trustScore: number;
  joinedAt?: string;
}

export type AssetCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'POOR';
export type AssetStatus = 'AVAILABLE' | 'UNAVAILABLE' | 'RENTED' | 'HIDDEN';
export type DeliveryMethod = 'PICKUP' | 'DELIVERY' | 'BOTH';

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
  condition: AssetCondition;
  pricePerDay: number;
  location: {
    city: string;
    district: string;
    latitude?: number;
    longitude?: number;
    approximateDistanceKm?: number;
  };
  status: AssetStatus;
  ownerId: string;
  categoryId: string;
  images: AssetImage[];
  owner?: User;
  rating: number;
  reviewCount: number;
  deliveryMethods: DeliveryMethod[];
}

export type RentalStatus = 
  | 'PENDING_OWNER'
  | 'APPROVED'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_SIGNATURE'
  | 'READY_FOR_HANDOVER'
  | 'ONGOING'
  | 'RETURNED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTED';

export interface Rental {
  id: string;
  assetId: string;
  ownerId: string;
  renterId: string;
  startAt: string;
  endAt: string;
  
  // Pricing breakdown
  pricing: {
    rentalFee: number;
    serviceFee: number;
    deliveryFee: number;
    lateFee: number;
    totalAmount: number;
  };
  
  status: RentalStatus;
  deliveryMethod: DeliveryMethod;
  
  // Relationships
  asset?: Asset;
  owner?: User;
  renter?: User;
  
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}
