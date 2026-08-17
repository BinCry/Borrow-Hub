import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    user: {
      count: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    userVerification: {
      count: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
    rentalRequest: {
      count: jest.fn(),
      aggregate: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
    payment: {
      aggregate: jest.fn(),
    },
    refund: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    payout: {
      aggregate: jest.fn(),
      count: jest.fn(),
    },
    report: {
      count: jest.fn(),
    },
    riskIncident: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    role: {
      findMany: jest.fn(),
    },
    systemConfig: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    auditLog: {
      findMany: jest.fn(),
    },
    userRole: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const auditService = {
    create: jest.fn(),
  };

  const requestLogsService = {
    list: jest.fn(),
  };

  const cacheManager = {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    clear: jest.fn(),
  };

  let service: AdminService;

  beforeEach(() => {
    jest.clearAllMocks();
    cacheManager.get.mockResolvedValue(undefined);
    cacheManager.set.mockResolvedValue(undefined);
    cacheManager.del.mockResolvedValue(true);
    cacheManager.clear.mockResolvedValue(true);
    service = new AdminService(
      prisma as never,
      auditService as never,
      requestLogsService as never,
      cacheManager as never,
    );
  });

  it('returns enriched dashboard metrics for marketplace, finance, risk and trust', async () => {
    prisma.user.count
      .mockResolvedValueOnce(100)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(2);
    prisma.userVerification.count.mockResolvedValue(72);
    prisma.asset.count.mockResolvedValue(48);
    prisma.rentalRequest.count
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(25)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4);
    prisma.dispute.count
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(6);
    prisma.payment.aggregate.mockResolvedValue({
      _sum: {
        amount: 12000000,
      },
    });
    prisma.rentalRequest.aggregate.mockResolvedValue({
      _sum: {
        serviceFee: 900000,
      },
    });
    prisma.refund.aggregate.mockResolvedValue({
      _sum: {
        amount: 700000,
      },
    });
    prisma.refund.count.mockResolvedValue(4);
    prisma.payout.aggregate.mockResolvedValue({
      _sum: {
        netAmount: 9800000,
      },
    });
    prisma.payout.count.mockResolvedValue(2);
    prisma.report.count
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prisma.riskIncident.count.mockResolvedValue(4);
    prisma.riskIncident.findMany.mockResolvedValue([
      { targetId: 'user-1' },
      { targetId: 'user-2' },
    ]);
    prisma.review.aggregate.mockResolvedValue({
      _avg: {
        rating: 4.6,
      },
    });

    const result = await service.getDashboard();

    expect(result.users).toEqual({
      total: 100,
      verified: 72,
      suspended: 6,
      banned: 2,
      kycCompletionRate: 0.72,
    });
    expect(result.marketplace).toEqual({
      activeListings: 48,
      totalRentals: 40,
      completedRentals: 25,
      cancelledRentals: 5,
      overdueRentals: 4,
      completionRate: 0.625,
      cancellationRate: 0.125,
      openIssues: 3,
    });
    expect(result.finance).toEqual({
      gmv: 12000000,
      platformRevenue: 900000,
      takeRate: 0.075,
      refundAmount: 700000,
      refundCount: 4,
      paidOut: 9800000,
      blockedPayoutCount: 2,
    });
    expect(result.risk).toEqual({
      openDisputes: 3,
      openReports: 5,
      fraudReports: 3,
      openRiskIncidents: 4,
      suspiciousAccounts: 2,
    });
    expect(result.trust).toEqual({
      disputeRate: 0.2,
      damageReportRate: 0.15,
      lateReturnRate: 0.1,
      fakeListingRate: 0.0417,
      averageRating: 4.6,
      kycCompletionRate: 0.72,
    });
    expect(cacheManager.set).toHaveBeenCalledWith(
      'admin:dashboard',
      result,
      30000,
    );
  });

  it('returns zero-safe rates when the dashboard has no denominator data', async () => {
    prisma.user.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.userVerification.count.mockResolvedValue(0);
    prisma.asset.count.mockResolvedValue(0);
    prisma.rentalRequest.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.dispute.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.payment.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.rentalRequest.aggregate.mockResolvedValue({ _sum: { serviceFee: null } });
    prisma.refund.aggregate.mockResolvedValue({ _sum: { amount: null } });
    prisma.refund.count.mockResolvedValue(0);
    prisma.payout.aggregate.mockResolvedValue({ _sum: { netAmount: null } });
    prisma.payout.count.mockResolvedValue(0);
    prisma.report.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(0);
    prisma.riskIncident.count.mockResolvedValue(0);
    prisma.riskIncident.findMany.mockResolvedValue([]);
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: null } });

    const result = await service.getDashboard();

    expect(result.users.kycCompletionRate).toBe(0);
    expect(result.marketplace.completionRate).toBe(0);
    expect(result.marketplace.cancellationRate).toBe(0);
    expect(result.finance.takeRate).toBe(0);
    expect(result.trust.disputeRate).toBe(0);
    expect(result.trust.damageReportRate).toBe(0);
    expect(result.trust.lateReturnRate).toBe(0);
    expect(result.trust.fakeListingRate).toBe(0);
    expect(result.trust.averageRating).toBe(0);
  });

  it('returns cached dashboard data when available', async () => {
    const cachedDashboard = {
      users: { total: 12 },
    };
    cacheManager.get.mockResolvedValue(cachedDashboard);

    const result = await service.getDashboard();

    expect(result).toBe(cachedDashboard);
    expect(prisma.user.count).not.toHaveBeenCalled();
    expect(cacheManager.set).not.toHaveBeenCalled();
  });
});
