import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { KycService } from './kyc.service';
import { KycReviewQueryDto, ReviewKycDto, SubmitKycDto } from './kyc.dto';

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

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('admin/requests')
  listRequests(@Query() query: KycReviewQueryDto) {
    return this.kycService.listRequests(query);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch('admin/users/:userId/status')
  reviewRequest(
    @Param('userId') userId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ReviewKycDto,
  ) {
    return this.kycService.reviewRequest(userId, currentUser, dto);
  }
}
