import { VerificationStatus } from '@prisma/client';
import { TrustScoreService } from './trust-score.service';

describe('TrustScoreService', () => {
  const prisma = {
    user: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    review: {
      aggregate: jest.fn(),
    },
    rentalRequest: {
      count: jest.fn(),
    },
    dispute: {
      count: jest.fn(),
    },
    riskIncident: {
      count: jest.fn(),
    },
  };

  let service: TrustScoreService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new TrustScoreService(prisma as never);
  });

  it('calculates a higher trust score for verified users with strong history', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-1',
      createdAt: new Date('2025-01-01T00:00:00.000Z'),
      verification: {
        verificationStatus: VerificationStatus.VERIFIED,
      },
    });
    prisma.review.aggregate.mockResolvedValue({
      _avg: {
        rating: 4.5,
      },
    });
    prisma.rentalRequest.count
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(0);
    prisma.dispute.count.mockResolvedValue(1);
    prisma.riskIncident.count.mockResolvedValue(0);

    const result = await service.recalculateUserTrustScore('user-1');

    expect(result).toBe(84);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { trustScore: 84 },
    });
  });

  it('clamps the trust score at zero for risky accounts', async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-2',
      createdAt: new Date(),
      verification: {
        verificationStatus: VerificationStatus.PENDING,
      },
    });
    prisma.review.aggregate.mockResolvedValue({
      _avg: {
        rating: null,
      },
    });
    prisma.rentalRequest.count
      .mockResolvedValueOnce(0)
      .mockResolvedValueOnce(5);
    prisma.dispute.count.mockResolvedValue(4);
    prisma.riskIncident.count.mockResolvedValue(3);

    const result = await service.recalculateUserTrustScore('user-2');

    expect(result).toBe(0);
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-2' },
      data: { trustScore: 0 },
    });
  });
});
