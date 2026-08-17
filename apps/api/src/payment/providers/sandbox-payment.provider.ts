import { Injectable, Logger } from '@nestjs/common';
import { IPaymentProvider, PaymentIntent, PaymentVerificationResult } from '../payment.interface';

@Injectable()
export class SandboxPaymentProvider implements IPaymentProvider {
  private readonly logger = new Logger(SandboxPaymentProvider.name);

  async createPaymentIntent(amount: number, currency: string, _metadata?: Record<string, string>): Promise<PaymentIntent> {
    this.logger.debug(`Creating Sandbox Payment Intent for ${amount} ${currency}`);
    return {
      amountDue: amount,
      currency,
      isPayable: true,
      clientSecret: 'sandbox_secret_' + Date.now().toString(),
    };
  }

  async verifyWebhook(payload: any, _signature: string): Promise<PaymentVerificationResult> {
    this.logger.debug('Verifying Sandbox Webhook');
    // In Sandbox, we just trust the payload for now. In production, this would verify HMAC.
    return {
      isVerified: true,
      providerTransactionId: payload?.transactionId || 'sandbox_tx_' + Date.now().toString(),
      amount: payload?.amount || 0,
      currency: payload?.currency || 'VND',
    };
  }

  async refund(providerTransactionId: string, amount: number): Promise<boolean> {
    this.logger.debug(`Refunding ${amount} for transaction ${providerTransactionId} in Sandbox`);
    return true;
  }
}
