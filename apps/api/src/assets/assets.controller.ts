import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  CreateAssetDto,
  ModerateAssetDto,
  SearchAssetsQueryDto,
  UpdateAssetDto,
} from './assets.dto';
import { AssetsService } from './assets.service';

@Controller('assets')
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Public()
  @Get()
  search(@Query() query: SearchAssetsQueryDto) {
    return this.assetsService.search(null, query);
  }

  @Get('my')
  listMine(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.assetsService.listMine(currentUser);
  }

  @Get(':assetId')
  getById(
    @Param('assetId') assetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.assetsService.getById(assetId, currentUser);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAssetDto,
  ) {
    return this.assetsService.create(currentUser, dto);
  }

  @Patch(':assetId')
  update(
    @Param('assetId') assetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateAssetDto,
  ) {
    return this.assetsService.update(assetId, currentUser, dto);
  }

  @Roles(RoleName.MODERATOR, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch(':assetId/moderate')
  moderate(
    @Param('assetId') assetId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: ModerateAssetDto,
  ) {
    return this.assetsService.moderate(assetId, currentUser, dto);
  }
}

