import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { CreateReviewDto } from './reviews.dto';
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
}

