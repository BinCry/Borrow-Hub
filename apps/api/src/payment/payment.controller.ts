import {
  Body,
  Controller,
  Headers,
  HttpCode,
  Post,
  Req,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { PaymentService } from './payment.service';
import { SepayWebhookDto } from './sepay-webhook.dto';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Public()
  @Post('webhooks/sepay')
  @HttpCode(200)
  handleSepayWebhook(
    @Body() dto: SepayWebhookDto,
    @Req() request: RawBodyRequest<Request>,
    @Headers('x-sepay-signature') signature?: string,
    @Headers('x-sepay-timestamp') timestamp?: string,
  ) {
    return this.paymentService.handleSepayWebhook(
      dto,
      request.rawBody,
      signature,
      timestamp,
    );
  }
}
