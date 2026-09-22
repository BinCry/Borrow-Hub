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
  statusReason?: string | null;
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

export type UpdateUserStatusPayload = {
  status: AdminUserStatus;
  reason?: string;
};

export type ModerateAssetPayload = {
  status: AssetStatus;
  reason?: string;
};

export type AdminDisputeStatus =
  | 'OPEN'
  | 'WAITING_RESPONSE'
  | 'UNDER_REVIEW'
  | 'RESOLVED'
  | 'REJECTED'
  | 'CLOSED';

export type AdminDisputeEventType =
  | 'OPENED'
  | 'RESPONSE_ADDED'
  | 'EVIDENCE_ATTACHED'
  | 'ASSIGNED'
  | 'STATUS_CHANGED'
  | 'RESOLVED'
  | 'NOTE';

type AdminDisputeUser = {
  id: string;
  fullName: string;
  email?: string | null;
};

export type AdminDispute = {
  id: string;
  rentalId: string;
  openedById: string;
  assignedToId?: string | null;
  reason: string;
  description: string;
  status: AdminDisputeStatus;
  resolutionSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  rental: {
    id: string;
    ownerId: string;
    renterId: string;
    status: string;
    startAt?: string;
    endAt?: string;
    asset: {
      id: string;
      title: string;
      pricePerDay?: number;
    };
    owner: AdminDisputeUser;
    renter: AdminDisputeUser;
    handovers?: {
      id: string;
      type: string;
      status: string;
      confirmedAt?: string | null;
      createdAt: string;
    }[];
    payout?: {
      id: string;
      status: string;
      amount?: number;
    } | null;
  };
  openedBy: AdminDisputeUser;
  assignedTo?: AdminDisputeUser | null;
  evidences: {
    id: string;
    createdAt: string;
    evidence: {
      id: string;
      type: string;
      fileUrl: string;
      createdAt: string;
    };
    uploadedBy: AdminDisputeUser;
  }[];
  events: {
    id: string;
    eventType: AdminDisputeEventType;
    content: string;
    metadata?: Record<string, unknown> | null;
    createdAt: string;
    actor?: AdminDisputeUser | null;
  }[];
};

export type UpdateDisputeStatusPayload = {
  status: AdminDisputeStatus;
  resolutionSummary?: string;
  note?: string;
};

export type RespondDisputePayload = {
  content: string;
};

export type AdminReviewStatus = 'PUBLISHED' | 'HIDDEN';

export type AdminReview = {
  id: string;
  rentalId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  comment?: string | null;
  status: AdminReviewStatus;
  createdAt: string;
  updatedAt: string;
  reviewer?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
  reviewee?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
  rental?: {
    id: string;
    assetId: string;
  };
};

export type AdminReportStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'REJECTED' | 'CLOSED';
export type AdminReportTargetType = 'USER' | 'ASSET' | 'REVIEW' | 'CHAT_MESSAGE';
export type AdminReportAction =
  | 'NONE'
  | 'WARN_REPORTED_USER'
  | 'SUSPEND_REPORTED_USER'
  | 'HIDE_ASSET'
  | 'HIDE_REVIEW'
  | 'HIDE_CHAT_MESSAGE';

export type AdminReport = {
  id: string;
  reporterId: string;
  targetType: AdminReportTargetType;
  targetId: string;
  reason: string;
  description: string;
  status: AdminReportStatus;
  assignedToId?: string | null;
  resolutionSummary?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
  reporter?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
  assignedTo?: {
    id: string;
    fullName: string;
    email?: string | null;
  } | null;
};

export type UpdateReportStatusPayload = {
  status: AdminReportStatus;
  action?: AdminReportAction;
  actionNote?: string;
  resolutionSummary?: string;
};

export type AdminPaymentStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'SUCCESS'
  | 'FAILED'
  | 'REFUNDED'
  | 'PARTIALLY_REFUNDED';
export type AdminRefundStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REJECTED';
export type AdminPayoutStatus = 'PENDING' | 'SCHEDULED' | 'PAID' | 'BLOCKED' | 'CANCELLED';

export type AdminPayment = {
  id: string;
  rentalId: string;
  payerId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  currency: string;
  status: AdminPaymentStatus;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  payer?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
  refunds: {
    id: string;
    paymentId: string;
    amount: number;
    reason: string;
    status: AdminRefundStatus;
    createdAt: string;
    completedAt?: string | null;
  }[];
  rental: {
    id: string;
    ownerId: string;
    asset: {
      id: string;
      title: string;
    };
    owner: {
      id: string;
      fullName: string;
      email?: string | null;
    };
    payout?: {
      id: string;
      status: AdminPayoutStatus;
    } | null;
  };
};

export type AdminPayout = {
  id: string;
  rentalId: string;
  ownerId: string;
  grossAmount: number;
  commissionAmount: number;
  netAmount: number;
  status: AdminPayoutStatus;
  scheduledAt?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    fullName: string;
    email?: string | null;
  };
  rental: {
    id: string;
    asset: {
      id: string;
      title: string;
    };
    renter: {
      id: string;
      fullName: string;
      email?: string | null;
    };
    payments?: AdminPayment[];
  };
};

export type CreateRefundPayload = {
  amount: number;
  reason: string;
};

export type BroadcastNotificationPayload = {
  title: string;
  content: string;
};

export type BroadcastNotificationResult = {
  recipientCount: number;
  broadcastId: string;
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

  async updateUserStatus(userId: string, payload: UpdateUserStatusPayload) {
    const response = await apiClient.patch<AdminUser>(`/admin/users/${userId}/status`, {
      ...payload,
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
        ...(!status ? { includeAllStatuses: 'true' } : {}),
        hideRemoved: 'true',
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

  async listDisputes(status?: AdminDisputeStatus) {
    const response = await apiClient.get<AdminDispute[]>('/disputes/admin', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async getDispute(disputeId: string) {
    const response = await apiClient.get<AdminDispute>(`/disputes/${disputeId}`);
    return response.data;
  },

  async respondDispute(disputeId: string, payload: RespondDisputePayload) {
    const response = await apiClient.post<AdminDispute>(
      `/disputes/${disputeId}/respond`,
      payload,
    );
    return response.data;
  },

  async updateDisputeStatus(disputeId: string, payload: UpdateDisputeStatusPayload) {
    const response = await apiClient.patch<AdminDispute>(
      `/disputes/${disputeId}/status`,
      payload,
    );
    return response.data;
  },

  async listReviews() {
    const response = await apiClient.get<AdminReview[]>('/reviews/admin/all');
    return response.data;
  },

  async moderateReview(reviewId: string, status: AdminReviewStatus) {
    const response = await apiClient.patch<AdminReview>(`/reviews/${reviewId}/moderate`, {
      status,
    });
    return response.data;
  },

  async listReports(status?: AdminReportStatus) {
    const response = await apiClient.get<AdminReport[]>('/reports/my', {
      params: {
        role: 'all',
        ...(status ? { status } : {}),
      },
    });
    return response.data;
  },

  async updateReportStatus(reportId: string, payload: UpdateReportStatusPayload) {
    const response = await apiClient.patch<AdminReport>(`/reports/${reportId}/status`, payload);
    return response.data;
  },

  async listPayments(status?: AdminPaymentStatus) {
    const response = await apiClient.get<AdminPayment[]>('/finance/payments/my', {
      params: {
        role: 'all',
        ...(status ? { status } : {}),
      },
    });
    return response.data;
  },

  async createRefund(paymentId: string, payload: CreateRefundPayload) {
    const response = await apiClient.post<AdminPayment>(
      `/finance/payments/${paymentId}/refunds`,
      payload,
    );
    return response.data;
  },

  async updateRefundStatus(refundId: string, status: AdminRefundStatus) {
    const response = await apiClient.patch<AdminPayment>(`/finance/refunds/${refundId}/status`, {
      status,
    });
    return response.data;
  },

  async listPayouts(status?: AdminPayoutStatus) {
    const response = await apiClient.get<AdminPayout[]>('/finance/payouts/my', {
      params: status ? { status } : undefined,
    });
    return response.data;
  },

  async updatePayoutStatus(payoutId: string, status: AdminPayoutStatus) {
    const response = await apiClient.patch<AdminPayout>(`/finance/payouts/${payoutId}/status`, {
      status,
    });
    return response.data;
  },

  async broadcastNotification(payload: BroadcastNotificationPayload) {
    const response = await apiClient.post<BroadcastNotificationResult>(
      '/notifications/admin/broadcast',
      payload,
    );
    return response.data;
  },
};
