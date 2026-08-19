export type UserStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'BANNED'
  | 'DELETED'
  | 'UNVERIFIED';

export interface User {
  id: string;
  email?: string;
  phone?: string;
  fullName: string;
  avatarUrl?: string | null;
  status?: UserStatus;
  trustScore?: number;
  joinedAt?: string;
  createdAt?: string;
  roles?: string[];
  verificationStatus?:
    | 'NOT_STARTED'
    | 'PENDING'
    | 'VERIFIED'
    | 'REJECTED'
    | 'REQUIRES_REVIEW';
}

export type AssetCondition = 'NEW' | 'LIKE_NEW' | 'GOOD' | 'FAIR' | 'WORN';
export type AssetStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'PAUSED'
  | 'REJECTED'
  | 'SUSPENDED'
  | 'ARCHIVED';
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
  categoryId?: string;
  images: AssetImage[];
  owner?: User;
  rating: number;
  reviewCount: number;
  completedRentalCount: number;
  deliveryMethods: DeliveryMethod[];
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  isFavorite?: boolean;
}

export type RentalStatus =
  | 'PENDING_OWNER'
  | 'APPROVED'
  | 'DECLINED'
  | 'AWAITING_PAYMENT'
  | 'AWAITING_SIGNATURE'
  | 'CONFIRMED'
  | 'READY_FOR_HANDOVER'
  | 'ONGOING'
  | 'RETURN_PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'DISPUTED'
  | 'OVERDUE';

export interface Rental {
  id: string;
  assetId: string;
  ownerId: string;
  renterId: string;
  startAt: string;
  endAt: string;
  currency: string;
  pricing: {
    rentalFee: number;
    serviceFee: number;
    deliveryFee: number;
    lateFee: number;
    totalAmount: number;
  };
  status: RentalStatus;
  deliveryMethod: DeliveryMethod | null;
  asset?: Asset;
  owner?: User;
  renter?: User;
  contract?: RentalContract | null;
  createdAt: string;
  updatedAt: string;
}

export interface RentalContract {
  id: string;
  contractNumber: string;
  version: number;
  contentHash: string;
  status: 'PENDING_SIGNATURE' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  snapshot: {
    owner: { id: string; fullName: string };
    renter: { id: string; fullName: string };
    asset: {
      id: string;
      title: string;
      serialNumber?: string | null;
      pricePerDay: number;
    };
    rental: {
      startAt: string;
      endAt: string;
      rentalFee: number;
      serviceFee: number;
      deliveryFee: number;
      totalAmount: number;
    };
  };
  signatures: {
    id: string;
    userId: string;
    signatureMethod: string;
    signedAt: string;
  }[];
  createdAt: string;
  activatedAt?: string | null;
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

export interface PaymentIntent {
  rentalId: string;
  assetId: string;
  status: RentalStatus;
  paymentProvider: 'SEPAY' | 'SANDBOX';
  currency: string;
  amountDue: number;
  totalAmount: number;
  isPayable: boolean;
  paymentId?: string;
  paymentCode?: string;
  expiresAt?: string;
  qrUrl?: string;
  bankAccount?: {
    accountNumber: string;
    accountName: string;
    bankName: string;
  };
}
