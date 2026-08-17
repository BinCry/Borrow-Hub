export interface PaymentIntent {
  amountDue: number;
  currency: string;
  isPayable: boolean;
  paymentId?: string;
  clientSecret?: string;
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  providerTransactionId: string;
  amount: number;
  currency: string;
}

export interface IPaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata?: Record<string, string>): Promise<PaymentIntent>;
  verifyWebhook(payload: any, signature: string): Promise<PaymentVerificationResult>;
  refund(providerTransactionId: string, amount: number): Promise<boolean>;
}
