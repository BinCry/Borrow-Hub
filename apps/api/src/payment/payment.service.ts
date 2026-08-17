import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PaymentProvider as PrismaPaymentProvider } from '@prisma/client';
import { IPaymentProvider } from './payment.interface';
import { SandboxPaymentProvider } from './providers/sandbox-payment.provider';

@Injectable()
export class PaymentService {
  private providers: Map<PrismaPaymentProvider, IPaymentProvider> = new Map();

  constructor(
    private readonly sandboxProvider: SandboxPaymentProvider,
  ) {
    this.providers.set(PrismaPaymentProvider.SANDBOX, this.sandboxProvider);
    // Future providers (VNPay, Momo) would be injected and registered here.
  }

  getProvider(providerType: PrismaPaymentProvider): IPaymentProvider {
    const provider = this.providers.get(providerType);
    if (!provider) {
      throw new InternalServerErrorException(`Payment provider ${providerType} is not registered`);
    }
    return provider;
  }
}
