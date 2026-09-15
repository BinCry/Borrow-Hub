import { apiClient } from '../api/client';
import type { AssetStatus } from '../../types/domain';

export type AdminRole =
  | 'USER'
  | 'PARTNER'
  | 'MODERATOR'
  | 'CUSTOMER_SUPPORT'
  | 'DISPUTE_OFFICER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';
export type KycVerificationStatus =
  | 'NOT_STARTED'
  | 'PENDING'
  | 'VERIFIED'
  | 'REJECTED'
  | 'REQUIRES_REVIEW';
export type KycFaceMatchStatus = 'MATCHED' | 'NOT_MATCHED' | 'REVIEW_REQUIRED';

export type AdminDashboard = {
  users: {
    total: number;
    verified: number;
    suspended: number;
    banned: number;
    kycCompletionRate: number;
  };
  marketplace: {
    activeListings: number;
    totalRentals: number;
    completedRentals: number;
    cancelledRentals: number;
    overdueRentals: number;
    completionRate: number;
    cancellationRate: number;
    openIssues: number;
  };
  finance: {
    gmv: number;
    platformRevenue: number;
    takeRate: number;
    refundAmount: number;
    refundCount: number;
    paidOut: number;
    blockedPayoutCount: number;
  };
  risk: {
    openDisputes: number;
    openReports: number;
    fraudReports: number;
    openRiskIncidents: number;
    suspiciousAccounts: number;
  };
  trust: {
    disputeRate: number;
    damageReportRate: number;
    lateReturnRate: number;
    fakeListingRate: number;
    averageRating: number;
    kycCompletionRate: number;
  };
};

export type AdminUser = {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  status: AdminUserStatus;
  trustScore: number;
  createdAt: string;
  lastLoginAt?: string | null;
  verification?: {
    verificationStatus?: string;
  } | null;
  userRoles: {
    role: {
      id: string;
      name: AdminRole;
      description?: string | null;
    };
  }[];
};

export type CreateInternalUserPayload = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  roles: AdminRole[];
};

export type AdminKycRequest = {
  id: string;
  userId: string;
  provider: string;
  providerReference?: string | null;
  verificationStatus: KycVerificationStatus;
  documentType: 'CCCD' | 'PASSPORT';
  maskedDocumentNumber: string;
  faceMatchStatus: KycFaceMatchStatus;
  nameVerified: boolean;
  dateOfBirthVerified: boolean;
  verifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    trustScore: number;
  };
  documentFrontUrl?: string | null;
  documentBackUrl?: string | null;
  selfieUrl?: string | null;
};

export type ReviewKycPayload = {
  verificationStatus: KycVerificationStatus;
  faceMatchStatus?: KycFaceMatchStatus;
  reviewNote?: string;
};

export type AdminAsset = {
  id: string;
  title: string;
  description?: string | null;
  brand?: string | null;
  model?: string | null;
  condition: string;
  estimatedValue?: number;
  pricePerDay: number;
  minimumDurationDays?: number;
  maximumDurationDays?: number;
  city: string;
  district: string;
  ward?: string | null;
  status: AssetStatus;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  category?: {
    id: string;
    name: string;
  } | null;
  owner?: {
    id: string;
    fullName: string;
    trustScore: number;
  } | null;
  images?: {
    id: string;
    url: string;
    isCover?: boolean;
    sortOrder?: number;
  }[];
};

export type AdminAssetList = {
  data: AdminAsset[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ModerateAssetPayload = {
  status: AssetStatus;
  reason?: string;
};

export const AdminService = {
  async getDashboard() {
    const response = await apiClient.get<AdminDashboard>('/admin/dashboard');
    return response.data;
  },

  async listUsers() {
    const response = await apiClient.get<AdminUser[]>('/admin/users');
    return response.data;
  },

  async updateUserStatus(userId: string, status: AdminUserStatus) {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, {
      status,
    });
    return response.data;
  },

  async createInternalUser(payload: CreateInternalUserPayload) {
    const response = await apiClient.post<AdminUser>('/admin/internal-users', payload);
    return response.data;
  },

  async listKycRequests(status?: KycVerificationStatus) {
    const response = await apiClient.get<AdminKycRequest[]>('/kyc/admin/requests', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async reviewKycRequest(userId: string, payload: ReviewKycPayload) {
    const response = await apiClient.patch<AdminKycRequest>(
      `/kyc/admin/users/${userId}/status`,
      payload,
    );
    return response.data;
  },

  async listAssetModerationRequests(status?: AssetStatus) {
    const response = await apiClient.get<AdminAssetList>('/assets', {
      params: {
        ...(status ? { status } : {}),
        limit: 50,
        sort: 'newest',
      },
    });
    return response.data;
  },

  async moderateAsset(assetId: string, payload: ModerateAssetPayload) {
    const response = await apiClient.patch<AdminAsset>(`/assets/${assetId}/moderate`, payload);
    return response.data;
  },
};
