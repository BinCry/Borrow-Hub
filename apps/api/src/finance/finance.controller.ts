import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  CreateRefundDto,
  PaymentQueryDto,
  PayoutQueryDto,
  RefundQueryDto,
  UpdatePayoutStatusDto,
  UpdateRefundStatusDto,
} from './finance.dto';
import { FinanceService } from './finance.service';

@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('payments/my')
  listMyPayments(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PaymentQueryDto,
  ) {
    return this.financeService.listMyPayments(currentUser, query);
  }

  @Get('payments/:paymentId')
  getPayment(
    @Param('paymentId') paymentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.financeService.getPayment(paymentId, currentUser);
  }

  @Get('payments/:paymentId/refunds')
  listRefunds(
    @Param('paymentId') paymentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: RefundQueryDto,
  ) {
    return this.financeService.listRefunds(paymentId, currentUser, query);
  }

  @Post('payments/:paymentId/refunds')
  createRefund(
    @Param('paymentId') paymentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateRefundDto,
  ) {
    return this.financeService.createRefund(paymentId, currentUser, dto);
  }

  @Patch('refunds/:refundId/status')
  updateRefundStatus(
    @Param('refundId') refundId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateRefundStatusDto,
  ) {
    return this.financeService.updateRefundStatus(refundId, currentUser, dto);
  }

  @Get('payouts/my')
  listMyPayouts(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: PayoutQueryDto,
  ) {
    return this.financeService.listMyPayouts(currentUser, query);
  }

  @Get('payouts/:payoutId')
  getPayout(
    @Param('payoutId') payoutId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.financeService.getPayout(payoutId, currentUser);
  }

  @Patch('payouts/:payoutId/status')
  updatePayoutStatus(
    @Param('payoutId') payoutId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdatePayoutStatusDto,
  ) {
    return this.financeService.updatePayoutStatus(payoutId, currentUser, dto);
  }
}
