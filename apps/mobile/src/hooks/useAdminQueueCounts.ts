import { useQuery } from '@tanstack/react-query';
import { AdminService } from '../services/admin/admin.service';

export function useAdminQueueCounts(options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const pendingKycQuery = useQuery({
    queryKey: ['admin', 'queue-counts', 'kyc', 'PENDING'],
    queryFn: () => AdminService.listKycRequests('PENDING'),
    enabled,
  });
  const reviewKycQuery = useQuery({
    queryKey: ['admin', 'queue-counts', 'kyc', 'REQUIRES_REVIEW'],
    queryFn: () => AdminService.listKycRequests('REQUIRES_REVIEW'),
    enabled,
  });
  const pendingListingsQuery = useQuery({
    queryKey: ['admin', 'queue-counts', 'listings', 'PENDING_REVIEW'],
    queryFn: () => AdminService.listAssetModerationRequests('PENDING_REVIEW'),
    enabled,
  });
  const openReportsQuery = useQuery({
    queryKey: ['admin', 'queue-counts', 'reports', 'OPEN'],
    queryFn: () => AdminService.listReports('OPEN'),
    enabled,
  });
  const openDisputesQuery = useQuery({
    queryKey: ['admin', 'queue-counts', 'disputes', 'OPEN'],
    queryFn: () => AdminService.listDisputes('OPEN'),
    enabled,
  });

  return {
    counts: {
      pendingKyc:
        (pendingKycQuery.data?.length ?? 0) +
        (reviewKycQuery.data?.length ?? 0),
      pendingListings:
        pendingListingsQuery.data?.pagination.total ??
        pendingListingsQuery.data?.data.length ??
        0,
      openReports: openReportsQuery.data?.length ?? 0,
      openDisputes: openDisputesQuery.data?.length ?? 0,
    },
    isRefetching:
      pendingKycQuery.isRefetching ||
      reviewKycQuery.isRefetching ||
      pendingListingsQuery.isRefetching ||
      openReportsQuery.isRefetching ||
      openDisputesQuery.isRefetching,
    refetch: () => {
      void pendingKycQuery.refetch();
      void reviewKycQuery.refetch();
      void pendingListingsQuery.refetch();
      void openReportsQuery.refetch();
      void openDisputesQuery.refetch();
    },
  };
}
