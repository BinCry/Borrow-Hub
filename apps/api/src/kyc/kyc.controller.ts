import { Body, Controller, Get, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './kyc.dto';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('me')
  getCurrentStatus(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.kycService.getCurrentStatus(currentUser.id);
  }

  @Post('submit')
  submit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
  ) {
    return this.kycService.submit(currentUser.id, dto);
  }
}

