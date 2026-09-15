import { apiClient } from '../api/client';

export type AdminRole =
  | 'USER'
  | 'PARTNER'
  | 'MODERATOR'
  | 'CUSTOMER_SUPPORT'
  | 'DISPUTE_OFFICER'
  | 'ADMIN'
  | 'SUPER_ADMIN';

export type AdminUserStatus = 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'DELETED';

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
};
