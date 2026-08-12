import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { CreateReviewDto, ModerateReviewDto, UpdateReviewDto } from './reviews.dto';
import { ReviewsService } from './reviews.service';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post('rentals/:rentalId')
  create(
    @Param('rentalId') rentalId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(rentalId, currentUser, dto);
  }

  @Get('users/:userId')
  listForUser(@Param('userId') userId: string) {
    return this.reviewsService.listForUser(userId);
  }

  @Patch(':reviewId')
  update(
    @Param('reviewId') reviewId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateReviewDto,
  ) {
    return this.reviewsService.update(reviewId, currentUser, dto);
  }

  @Roles(RoleName.MODERATOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('admin/all')
  listAll() {
    return this.reviewsService.listAll();
  }

  @Roles(RoleName.MODERATOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':reviewId/moderate')
  moderate(
    @Param('reviewId') reviewId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ModerateReviewDto,
  ) {
    return this.reviewsService.moderate(reviewId, currentUser, dto);
  }
}
