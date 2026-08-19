import { apiClient } from '../api/client';
import { mapAsset } from '../assets/assets.service';
import {
  DeliveryMethod,
  Paginated,
  PaymentIntent,
  Rental,
  RentalContract,
  RentalStatus,
  User,
} from '../../types/domain';

export interface CreateRentalPayload {
  assetId: string;
  startAt: string;
  endAt: string;
  deliveryMethod?: DeliveryMethod;
  message?: string;
}

type ApiRental = {
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
  currency?: string;
  status: RentalStatus;
  deliveryMethod?: DeliveryMethod | null;
  asset?: Parameters<typeof mapAsset>[0];
  owner?: User;
  renter?: User;
  contract?: RentalContract | null;
  createdAt: string;
  updatedAt: string;
};

function mapRental(rental: ApiRental): Rental {
  return {
    id: rental.id,
    assetId: rental.assetId,
    ownerId: rental.ownerId,
    renterId: rental.renterId,
    startAt: rental.startAt,
    endAt: rental.endAt,
    currency: rental.currency ?? 'VND',
    pricing: {
      rentalFee: rental.rentalFee,
      serviceFee: rental.serviceFee,
      deliveryFee: rental.deliveryFee,
      lateFee: rental.lateFee,
      totalAmount: rental.totalAmount,
    },
    status: rental.status,
    deliveryMethod: rental.deliveryMethod ?? null,
    asset: rental.asset ? mapAsset(rental.asset) : undefined,
    owner: rental.owner,
    renter: rental.renter,
    contract: rental.contract ?? null,
    createdAt: rental.createdAt,
    updatedAt: rental.updatedAt,
  };
}

export const RentalsService = {
  async getMyRentals(role: 'renter' | 'owner'): Promise<Paginated<Rental>> {
    const response = await apiClient.get<ApiRental[]>('/rentals/my', {
      params: { role },
    });
    const data = response.data.map(mapRental);

    return {
      data,
      meta: {
        total: data.length,
        page: 1,
        limit: data.length,
        totalPages: data.length ? 1 : 0,
        hasNextPage: false,
      },
    };
  },

  async getById(id: string): Promise<Rental> {
    const response = await apiClient.get<ApiRental>(`/rentals/${id}`);
    return mapRental(response.data);
  },

  async create(payload: CreateRentalPayload): Promise<Rental> {
    const response = await apiClient.post<ApiRental>('/rentals', payload);
    return mapRental(response.data);
  },

  async approve(id: string): Promise<Rental> {
    const response = await apiClient.patch<ApiRental>(`/rentals/${id}/approve`, {});
    return mapRental(response.data);
  },

  async decline(id: string, reason: string): Promise<Rental> {
    const response = await apiClient.patch<ApiRental>(`/rentals/${id}/decline`, {
      reason,
    });
    return mapRental(response.data);
  },

  async cancel(id: string, reason: string): Promise<Rental> {
    const response = await apiClient.post<ApiRental>(`/rentals/${id}/cancel`, {
      reason,
    });
    return mapRental(response.data);
  },

  async getPaymentIntent(id: string): Promise<PaymentIntent> {
    const response = await apiClient.get<PaymentIntent>(
      `/rentals/${id}/payment-intent`,
    );
    return response.data;
  },

  async settleSandboxPayment(id: string): Promise<Rental> {
    const response = await apiClient.post<ApiRental>(`/rentals/${id}/pay`, {});
    return mapRental(response.data);
  },
};
