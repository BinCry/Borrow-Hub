import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { SandboxPaymentProvider } from './providers/sandbox-payment.provider';

@Module({
  providers: [PaymentService, SandboxPaymentProvider],
  exports: [PaymentService],
})
export class PaymentModule {}
