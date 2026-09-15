import { AdminService } from '../src/services/admin/admin.service';
import { apiClient } from '../src/services/api/client';

jest.mock('../src/services/api/client', () => ({
  apiClient: {
    get: jest.fn(),
    patch: jest.fn(),
    post: jest.fn(),
  },
}));

beforeEach(() => {
  apiClient.get.mockReset();
  apiClient.patch.mockReset();
  apiClient.post.mockReset();
});

test('loads admin moderation queues from the expected endpoints', async () => {
  apiClient.get.mockResolvedValue({ data: [] });

  await AdminService.listReviews();
  await AdminService.listReports('OPEN');
  await AdminService.listPayments('SUCCESS');
  await AdminService.listPayouts('PENDING');

  expect(apiClient.get).toHaveBeenNthCalledWith(1, '/reviews/admin/all');
  expect(apiClient.get).toHaveBeenNthCalledWith(2, '/reports/my', {
    params: { role: 'all', status: 'OPEN' },
  });
  expect(apiClient.get).toHaveBeenNthCalledWith(3, '/finance/payments/my', {
    params: { role: 'all', status: 'SUCCESS' },
  });
  expect(apiClient.get).toHaveBeenNthCalledWith(4, '/finance/payouts/my', {
    params: { status: 'PENDING' },
  });
});

test('submits admin moderation and finance actions to the expected endpoints', async () => {
  apiClient.patch.mockResolvedValue({ data: {} });
  apiClient.post.mockResolvedValue({ data: {} });

  await AdminService.moderateReview('review-1', 'HIDDEN');
  await AdminService.updateReportStatus('report-1', {
    status: 'RESOLVED',
    action: 'HIDE_REVIEW',
    resolutionSummary: 'Handled by moderator',
  });
  await AdminService.createRefund('payment-1', {
    amount: 100000,
    reason: 'Rental cancelled',
  });
  await AdminService.updateRefundStatus('refund-1', 'COMPLETED');
  await AdminService.updatePayoutStatus('payout-1', 'PAID');

  expect(apiClient.patch).toHaveBeenNthCalledWith(
    1,
    '/reviews/review-1/moderate',
    { status: 'HIDDEN' },
  );
  expect(apiClient.patch).toHaveBeenNthCalledWith(
    2,
    '/reports/report-1/status',
    {
      status: 'RESOLVED',
      action: 'HIDE_REVIEW',
      resolutionSummary: 'Handled by moderator',
    },
  );
  expect(apiClient.post).toHaveBeenCalledWith(
    '/finance/payments/payment-1/refunds',
    { amount: 100000, reason: 'Rental cancelled' },
  );
  expect(apiClient.patch).toHaveBeenNthCalledWith(
    3,
    '/finance/refunds/refund-1/status',
    { status: 'COMPLETED' },
  );
  expect(apiClient.patch).toHaveBeenNthCalledWith(
    4,
    '/finance/payouts/payout-1/status',
    { status: 'PAID' },
  );
});
