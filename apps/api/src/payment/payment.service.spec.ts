import { UnauthorizedException } from '@nestjs/common';
import { PaymentProvider, PaymentStatus } from '@prisma/client';
import { createHmac } from 'crypto';
import { PaymentService } from './payment.service';
import { SepayWebhookDto } from './sepay-webhook.dto';

describe('PaymentService SePay webhook', () => {
  const secret = 'sepay-webhook-secret-1234567890';
  const payload: SepayWebhookDto = {
    id: 92704,
    gateway: 'Vietcombank',
    transactionDate: '2026-08-19 10:30:00',
    accountNumber: '0123456789',
    subAccount: '',
    code: 'BHABCDEF123456',
    content: 'BHABCDEF123456 chuyen tien',
    transferType: 'in',
    description: 'Borrow Hub payment',
    transferAmount: 630000,
    accumulated: 10000000,
    referenceCode: 'FT2608190001',
  };
  const pendingPayment = {
    id: 'payment-1',
    provider: PaymentProvider.SEPAY,
    status: PaymentStatus.PENDING,
    amount: 630000,
    rental: {
      id: 'rental-1',
      totalAmount: 630000,
      currency: 'VND',
    },
  };

  const prisma = {
    payment: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    riskIncident: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  const configService = {
    getOrThrow: jest.fn((key: string) => {
      if (key === 'SEPAY_ACCOUNT_NUMBER') {
        return '0123456789';
      }
      if (key === 'SEPAY_WEBHOOK_SECRET') {
        return secret;
      }
      throw new Error(`Unexpected config key: ${key}`);
    }),
  };
  const rentalsService = {
    settleVerifiedPayment: jest.fn(),
  };

  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.payment.findFirst.mockResolvedValue(null);
    prisma.payment.findUnique.mockResolvedValue(pendingPayment);
    prisma.payment.updateMany.mockResolvedValue({ count: 1 });
    prisma.$transaction.mockImplementation(
      async (callback: (tx: typeof prisma) => unknown) => callback(prisma),
    );
    rentalsService.settleVerifiedPayment.mockResolvedValue({ id: 'rental-1' });
    service = new PaymentService(
      prisma as never,
      configService as never,
      rentalsService as never,
    );
  });

  function sign(rawBody: Buffer, timestamp: string) {
    return `sha256=${createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex')}`;
  }

  it('verifies HMAC and settles an exact incoming payment', async () => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));

    await expect(
      service.handleSepayWebhook(
        payload,
        rawBody,
        sign(rawBody, timestamp),
        timestamp,
      ),
    ).resolves.toEqual({ success: true });

    expect(rentalsService.settleVerifiedPayment).toHaveBeenCalledWith(
      pendingPayment.id,
      `sepay:${payload.id}`,
      expect.objectContaining({
        transferAmount: payload.transferAmount,
        sepayTransactionId: payload.id,
      }),
    );
  });

  it('rejects an invalid webhook signature before reading payment data', async () => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));

    await expect(
      service.handleSepayWebhook(
        payload,
        rawBody,
        'sha256=invalid',
        timestamp,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.payment.findFirst).not.toHaveBeenCalled();
  });

  it('acknowledges a replay without settling the rental twice', async () => {
    const rawBody = Buffer.from(JSON.stringify(payload));
    const timestamp = String(Math.floor(Date.now() / 1000));
    prisma.payment.findFirst.mockResolvedValue({
      id: pendingPayment.id,
      status: PaymentStatus.SUCCESS,
    });

    await expect(
      service.handleSepayWebhook(
        payload,
        rawBody,
        sign(rawBody, timestamp),
        timestamp,
      ),
    ).resolves.toEqual({ success: true, duplicate: true });
    expect(rentalsService.settleVerifiedPayment).not.toHaveBeenCalled();
  });

  it('moves an amount mismatch to manual review', async () => {
    const mismatchedPayload = {
      ...payload,
      id: 92705,
      transferAmount: 620000,
    };
    const rawBody = Buffer.from(JSON.stringify(mismatchedPayload));
    const timestamp = String(Math.floor(Date.now() / 1000));

    await expect(
      service.handleSepayWebhook(
        mismatchedPayload,
        rawBody,
        sign(rawBody, timestamp),
        timestamp,
      ),
    ).resolves.toEqual({ success: true, reviewRequired: true });
    expect(prisma.payment.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: PaymentStatus.PROCESSING,
          providerTransactionId: `review:sepay:${mismatchedPayload.id}`,
        }),
      }),
    );
    expect(prisma.riskIncident.create).toHaveBeenCalled();
    expect(rentalsService.settleVerifiedPayment).not.toHaveBeenCalled();
  });
});
