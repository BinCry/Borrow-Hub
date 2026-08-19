import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { KycReviewQueryDto, ReviewKycDto, SubmitKycDto } from './kyc.dto';
import { KycService, KycUploadFiles } from './kyc.service';

@Controller('kyc')
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Get('me')
  getCurrentStatus(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.kycService.getCurrentStatus(currentUser.id);
  }

  @Post('submit')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'documentFront', maxCount: 1 },
        { name: 'documentBack', maxCount: 1 },
        { name: 'selfie', maxCount: 1 },
      ],
      { limits: { files: 3, fileSize: 10 * 1024 * 1024 } },
    ),
  )
  submit(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: SubmitKycDto,
    @UploadedFiles() files: KycUploadFiles,
  ) {
    return this.kycService.submit(currentUser.id, dto, files);
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
