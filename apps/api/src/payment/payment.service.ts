import {
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PaymentProvider,
  PaymentStatus,
  Prisma,
  RiskIncidentStatus,
  RiskLevel,
  RiskTargetType,
} from '@prisma/client';
import { createHmac, timingSafeEqual } from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RentalsService } from '../rentals/rentals.service';
import { SepayWebhookDto } from './sepay-webhook.dto';

const WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS = 5 * 60;
const PAYMENT_CODE_PATTERN = /BH[A-Z0-9]{10,20}/i;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly rentalsService: RentalsService,
  ) {}

  async handleSepayWebhook(
    dto: SepayWebhookDto,
    rawBody: Buffer | undefined,
    signature: string | undefined,
    timestamp: string | undefined,
  ) {
    this.verifySepaySignature(rawBody, signature, timestamp);

    if (dto.transferType !== 'in') {
      return { success: true, ignored: true };
    }

    const completedTransactionId = `sepay:${dto.id}`;
    const reviewTransactionId = `review:sepay:${dto.id}`;
    const duplicate = await this.prisma.payment.findFirst({
      where: {
        providerTransactionId: {
          in: [completedTransactionId, reviewTransactionId],
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (duplicate) {
      return { success: true, duplicate: true };
    }

    const configuredAccount =
      this.configService.getOrThrow<string>('SEPAY_ACCOUNT_NUMBER');

    if (dto.accountNumber !== configuredAccount) {
      this.logger.warn('Ignored SePay transaction for an unexpected account');
      return { success: true, ignored: true };
    }

    const paymentCode = this.extractPaymentCode(dto.code, dto.content);

    if (!paymentCode) {
      this.logger.warn('Ignored SePay transaction without a Borrow Hub payment code');
      return { success: true, ignored: true };
    }

    const payment = await this.prisma.payment.findUnique({
      where: {
        providerTransactionId: `intent:${PaymentProvider.SEPAY}:${paymentCode}`,
      },
      include: {
        rental: {
          select: {
            id: true,
            totalAmount: true,
            currency: true,
          },
        },
      },
    });

    if (!payment || payment.provider !== PaymentProvider.SEPAY) {
      this.logger.warn('Ignored SePay transaction with an unknown payment code');
      return { success: true, ignored: true };
    }

    if (
      payment.rental.currency !== 'VND' ||
      dto.transferAmount !== payment.amount ||
      dto.transferAmount !== payment.rental.totalAmount
    ) {
      await this.flagPaymentForReview(
        payment.id,
        payment.rental.id,
        reviewTransactionId,
        dto,
      );
      return { success: true, reviewRequired: true };
    }

    await this.rentalsService.settleVerifiedPayment(
      payment.id,
      completedTransactionId,
      {
        gateway: dto.gateway,
        transactionDate: dto.transactionDate,
        accountNumber: dto.accountNumber,
        transferAmount: dto.transferAmount,
        referenceCode: dto.referenceCode,
        sepayTransactionId: dto.id,
      },
    );

    return { success: true };
  }

  private verifySepaySignature(
    rawBody: Buffer | undefined,
    signature: string | undefined,
    timestampValue: string | undefined,
  ) {
    const timestamp = Number(timestampValue);
    const now = Math.floor(Date.now() / 1000);

    if (
      !rawBody ||
      !signature ||
      !Number.isSafeInteger(timestamp) ||
      Math.abs(now - timestamp) > WEBHOOK_TIMESTAMP_TOLERANCE_SECONDS
    ) {
      throw new UnauthorizedException('Invalid SePay webhook signature');
    }

    const secret = this.configService.getOrThrow<string>(
      'SEPAY_WEBHOOK_SECRET',
    );
    const expected = `sha256=${createHmac('sha256', secret)
      .update(`${timestamp}.${rawBody.toString('utf8')}`)
      .digest('hex')}`;
    const providedBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);

    if (
      providedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(providedBuffer, expectedBuffer)
    ) {
      throw new UnauthorizedException('Invalid SePay webhook signature');
    }
  }

  private extractPaymentCode(code?: string | null, content?: string) {
    const candidate = code?.match(PAYMENT_CODE_PATTERN)?.[0] ??
      content?.match(PAYMENT_CODE_PATTERN)?.[0];
    return candidate?.toUpperCase() ?? null;
  }

  private async flagPaymentForReview(
    paymentId: string,
    rentalId: string,
    reviewTransactionId: string,
    dto: SepayWebhookDto,
  ) {
    try {
      await this.prisma.$transaction(async (tx) => {
        const updated = await tx.payment.updateMany({
          where: {
            id: paymentId,
            status: {
              in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
            },
          },
          data: {
            status: PaymentStatus.PROCESSING,
            providerTransactionId: reviewTransactionId,
            metadata: {
              gateway: dto.gateway,
              transferAmount: dto.transferAmount,
              transactionDate: dto.transactionDate,
              referenceCode: dto.referenceCode,
              sepayTransactionId: dto.id,
              reviewReason: 'PAYMENT_AMOUNT_MISMATCH',
            } satisfies Prisma.InputJsonObject,
          },
        });

        if (updated.count !== 1) {
          return;
        }

        await tx.riskIncident.create({
          data: {
            targetType: RiskTargetType.RENTAL,
            targetId: rentalId,
            level: RiskLevel.HIGH,
            title: 'SePay payment amount mismatch',
            reason: 'PAYMENT_AMOUNT_MISMATCH',
            status: RiskIncidentStatus.OPEN,
            metadata: {
              paymentId,
              receivedAmount: dto.transferAmount,
              sepayTransactionId: dto.id,
            } satisfies Prisma.InputJsonObject,
          },
        });
      });
    } catch (error: unknown) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        return;
      }

      throw error;
    }
  }
}
