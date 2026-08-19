import { BadRequestException, ConflictException } from '@nestjs/common';
import {
  FaceMatchStatus,
  VerificationStatus,
} from '@prisma/client';
import sharp from 'sharp';
import { KycService, KycUploadFiles } from './kyc.service';

describe('KycService', () => {
  const prisma = {
    userVerification: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };
  const auditService = { create: jest.fn() };
  const analyticsService = { track: jest.fn() };
  const notificationsService = { createMany: jest.fn() };
  const trustScoreService = { recalculateUserTrustScore: jest.fn() };
  const storageService = {
    uploadSensitiveDocument: jest.fn(),
    deleteSensitiveDocument: jest.fn(),
    getSignedUrlForSensitiveDocument: jest.fn(),
  };

  let service: KycService;
  let imageBuffer: Buffer;

  beforeAll(async () => {
    imageBuffer = await sharp({
      create: {
        width: 4,
        height: 4,
        channels: 3,
        background: '#ffffff',
      },
    })
      .png()
      .toBuffer();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    analyticsService.track.mockResolvedValue(undefined);
    storageService.uploadSensitiveDocument.mockImplementation(
      async (key: string) => `secure/${key}`,
    );
    storageService.deleteSensitiveDocument.mockResolvedValue(undefined);
    service = new KycService(
      prisma as never,
      auditService as never,
      analyticsService as never,
      notificationsService as never,
      trustScoreService as never,
      storageService as never,
    );
  });

  it('stores normalized evidence but never returns private storage keys', async () => {
    prisma.userVerification.findUnique.mockResolvedValue(null);
    prisma.userVerification.upsert.mockImplementation(
      async ({ create }: { create: Record<string, unknown> }) => ({
        id: 'verification-1',
        providerReference: 'provider-reference',
        verificationStatus: VerificationStatus.PENDING,
        documentFrontKey: create.documentFrontKey,
        documentBackKey: create.documentBackKey,
        selfieKey: create.selfieKey,
        documentType: create.documentType,
        maskedDocumentNumber: create.maskedDocumentNumber,
        provider: create.provider,
        faceMatchStatus: FaceMatchStatus.REVIEW_REQUIRED,
      }),
    );

    const result = await service.submit(
      'user-1',
      { documentType: 'CCCD', documentNumber: '012345678901' },
      createFiles(),
    );

    expect(storageService.uploadSensitiveDocument).toHaveBeenCalledTimes(3);
    expect(storageService.uploadSensitiveDocument).toHaveBeenCalledWith(
      expect.stringContaining('kyc/user-1/'),
      expect.any(Buffer),
      'image/webp',
    );
    expect(result).toMatchObject({
      verificationStatus: VerificationStatus.PENDING,
      maskedDocumentNumber: '********8901',
      hasDocumentFront: true,
      hasDocumentBack: true,
      hasSelfie: true,
    });
    expect(result).not.toHaveProperty('documentFrontKey');
    expect(result).not.toHaveProperty('documentBackKey');
    expect(result).not.toHaveProperty('selfieKey');
  });

  it('requires both sides of a CCCD and a selfie', async () => {
    const files = createFiles();
    delete files.documentBack;

    await expect(
      service.submit(
        'user-1',
        { documentType: 'CCCD', documentNumber: '012345678901' },
        files,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(storageService.uploadSensitiveDocument).not.toHaveBeenCalled();
  });

  it('prevents replacing an already verified identity', async () => {
    prisma.userVerification.findUnique.mockResolvedValue({
      verificationStatus: VerificationStatus.VERIFIED,
    });

    await expect(
      service.submit(
        'user-1',
        { documentType: 'CCCD', documentNumber: '012345678901' },
        createFiles(),
      ),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(storageService.uploadSensitiveDocument).not.toHaveBeenCalled();
  });

  function createFiles(): KycUploadFiles {
    const file = {
      originalname: 'evidence.png',
      mimetype: 'image/png',
      size: imageBuffer.length,
      buffer: imageBuffer,
    };

    return {
      documentFront: [{ ...file }],
      documentBack: [{ ...file }],
      selfie: [{ ...file }],
    };
  }
});
