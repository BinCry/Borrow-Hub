import { BadRequestException } from '@nestjs/common';
import { RentalStatus } from '@prisma/client';
import { UsersService } from './users.service';

describe('UsersService account deletion', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    asset: { updateMany: jest.fn() },
    review: { aggregate: jest.fn() },
    userAddress: { deleteMany: jest.fn() },
    userVerification: { deleteMany: jest.fn() },
    favoriteAsset: { deleteMany: jest.fn() },
    notification: { deleteMany: jest.fn() },
    conversationMember: { deleteMany: jest.fn() },
    userRole: { deleteMany: jest.fn() },
    $transaction: jest.fn(),
  };
  const storageService = {
    deleteSensitiveDocument: jest.fn(),
  };
  const mailService = {
    sendAccountDeletionConfirmation: jest.fn(),
  };
  const configService = {
    get: jest.fn(),
  };
  let service: UsersService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    storageService.deleteSensitiveDocument.mockResolvedValue(undefined);
    prisma.user.updateMany.mockResolvedValue({ count: 1 });
    service = new UsersService(
      prisma as never,
      storageService as never,
      mailService as never,
      configService as never,
    );
  });

  it('blocks deletion while any non-terminal rental remains', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      rentalsAsOwner: [{ status: RentalStatus.AWAITING_PAYMENT }],
      rentalsAsRenter: [],
      verification: null,
    });

    await expect(service.deleteAccount('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it('returns public activity and ratings without exposing account or verification details', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'owner-1', fullName: 'Owner', avatarUrl: null, trustScore: 80,
      createdAt: new Date('2026-01-01'),
      verification: { verificationStatus: 'VERIFIED' },
      _count: { ownedAssets: 2, rentalsAsOwner: 3 },
      ownedAssets: [], receivedReviews: [],
    });
    prisma.review.aggregate.mockResolvedValue({ _avg: { rating: 4.5 }, _count: { _all: 2 } });

    const result = await service.getPublicProfile('owner-1');

    expect(result).toMatchObject({
      isVerified: true, verificationStatus: 'VERIFIED', activeListingCount: 2, totalRentals: 3,
      averageRating: 4.5, reviewCount: 2, assets: [], reviews: [],
    });
    const { select, where } = prisma.user.findUnique.mock.calls[0][0];
    expect(where).toEqual({ id: 'owner-1', status: 'ACTIVE' });
    expect(select.email).toBeUndefined();
    expect(select.phone).toBeUndefined();
    expect(select.addresses).toBeUndefined();
    expect(select.verification).toEqual({ select: { verificationStatus: true } });
    expect(select.ownedAssets.where).toEqual({ status: 'ACTIVE' });
    expect(select.receivedReviews.where).toEqual({ status: 'PUBLISHED' });
    expect(select._count.select.rentalsAsOwner.where).toEqual({
      payments: { some: { status: { in: ['SUCCESS', 'PARTIALLY_REFUNDED', 'REFUNDED'] } } },
    });
    expect(prisma.review.aggregate).toHaveBeenCalledWith({
      where: { revieweeId: 'owner-1', status: 'PUBLISHED' },
      _avg: { rating: true }, _count: { _all: true },
    });
  });

  it('anonymizes the account and removes KYC files after the transaction', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      status: 'ACTIVE',
      rentalsAsOwner: [],
      rentalsAsRenter: [],
      verification: {
        documentFrontKey: 'secure/kyc/front.webp',
        documentBackKey: 'secure/kyc/back.webp',
        selfieKey: 'secure/kyc/selfie.webp',
      },
    });
    const result = await service.deleteAccount('user-1');

    expect(prisma.asset.updateMany).toHaveBeenCalled();
    expect(prisma.userAddress.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(prisma.userVerification.deleteMany).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(storageService.deleteSensitiveDocument).toHaveBeenCalledTimes(3);
    expect(result.success).toBe(true);
  });

  it('returns a generic response for an unknown deletion email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.requestAccountDeletion('unknown@example.com'),
    ).resolves.toEqual({ success: true });
    expect(mailService.sendAccountDeletionConfirmation).not.toHaveBeenCalled();
  });

  it('deletes an account only when a valid confirmation token is supplied', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({
        id: 'user-1',
        status: 'ACTIVE',
        accountDeletionExpiresAt: new Date(Date.now() + 60_000),
      })
      .mockResolvedValueOnce({
        id: 'user-1',
        status: 'ACTIVE',
        rentalsAsOwner: [],
        rentalsAsRenter: [],
        verification: null,
      });

    await expect(
      service.confirmAccountDeletion('a'.repeat(64)),
    ).resolves.toEqual({
      success: true,
      message: 'Account has been securely deleted',
    });
    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ accountDeletionTokenHash: expect.any(String) }),
      }),
    );
  });
});
