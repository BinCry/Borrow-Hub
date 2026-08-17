import { User, Asset, Rental } from '../types/domain';

export const mockUsers: Record<string, User> = {
  'user-1': {
    id: 'user-1',
    email: 'john@example.com',
    phone: '0901234567',
    fullName: 'John Doe',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-1',
    status: 'ACTIVE',
    trustScore: 4.8,
    joinedAt: '2025-01-15T00:00:00Z',
  },
  'user-2': {
    id: 'user-2',
    email: 'jane@example.com',
    phone: '0987654321',
    fullName: 'Jane Smith',
    avatarUrl: 'https://i.pravatar.cc/150?u=user-2',
    status: 'ACTIVE',
    trustScore: 5.0,
    joinedAt: '2025-03-20T00:00:00Z',
  },
};

export const mockAssets: Record<string, Asset> = {
  'asset-1': {
    id: 'asset-1',
    title: 'Máy khoan pin Makita 18V',
    description: 'Máy khoan pin chính hãng, còn mới 90%. Đi kèm 2 pin và sạc nhanh. Rất phù hợp cho các công việc sửa chữa gia đình.',
    brand: 'Makita',
    model: 'DDF482',
    condition: 'GOOD',
    pricePerDay: 50000,
    location: {
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 1',
      latitude: 10.762622,
      longitude: 106.660172,
      approximateDistanceKm: 2.5,
    },
    status: 'AVAILABLE',
    ownerId: 'user-1',
    categoryId: 'tools',
    images: [
      { id: 'img-1', url: 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=800', isCover: true },
    ],
    owner: mockUsers['user-1'],
    rating: 4.5,
    reviewCount: 12,
    deliveryMethods: ['PICKUP'],
  },
  'asset-2': {
    id: 'asset-2',
    title: 'Lều cắm trại 4 người Naturehike',
    description: 'Lều 2 lớp chống nước, chống gió cực tốt. Khung nhôm siêu nhẹ. Phù hợp cho nhóm bạn 3-4 người đi camping.',
    brand: 'Naturehike',
    model: 'P-Series 4',
    condition: 'LIKE_NEW',
    pricePerDay: 120000,
    location: {
      city: 'TP. Hồ Chí Minh',
      district: 'Quận 7',
      approximateDistanceKm: 8.2,
    },
    status: 'AVAILABLE',
    ownerId: 'user-2',
    categoryId: 'camping',
    images: [
      { id: 'img-2', url: 'https://images.unsplash.com/photo-1504280327322-7f7f90f23f85?auto=format&fit=crop&q=80&w=800', isCover: true },
    ],
    owner: mockUsers['user-2'],
    rating: 5.0,
    reviewCount: 3,
    deliveryMethods: ['PICKUP', 'DELIVERY'],
  },
};

export const mockRentals: Record<string, Rental> = {
  'rental-1': {
    id: 'rental-1',
    assetId: 'asset-1',
    ownerId: 'user-1',
    renterId: 'user-2',
    startAt: '2026-08-20T08:00:00Z',
    endAt: '2026-08-22T18:00:00Z',
    pricing: {
      rentalFee: 150000,
      serviceFee: 15000,
      deliveryFee: 0,
      lateFee: 0,
      totalAmount: 165000,
    },
    status: 'PENDING_OWNER',
    deliveryMethod: 'PICKUP',
    asset: mockAssets['asset-1'],
    owner: mockUsers['user-1'],
    renter: mockUsers['user-2'],
    createdAt: '2026-08-17T10:00:00Z',
    updatedAt: '2026-08-17T10:00:00Z',
  }
};
