import { Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly favoritesService: FavoritesService) {}

  @Get()
  list(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.favoritesService.list(currentUser);
  }

  @Post('assets/:assetId')
  add(
    @Param('assetId') assetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.favoritesService.add(assetId, currentUser);
  }

  @Delete('assets/:assetId')
  remove(
    @Param('assetId') assetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.favoritesService.remove(assetId, currentUser);
  }
}
