import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { UsersService } from './users.service';
import { CreateAddressDto, UpdateAddressDto, UpdateProfileDto } from './users.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.getProfile(currentUser.id);
  }

  @Delete('me/account')
  deleteAccount(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.deleteAccount(currentUser.id);
  }

  @Patch('me')
  updateMe(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.usersService.updateProfile(currentUser.id, dto);
  }

  @Get('me/addresses')
  listAddresses(@CurrentUser() currentUser: AuthenticatedUser) {
    return this.usersService.listAddresses(currentUser.id);
  }

  @Post('me/addresses')
  createAddress(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(currentUser.id, dto);
  }

  @Patch('me/addresses/:addressId')
  updateAddress(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('addressId') addressId: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(currentUser.id, addressId, dto);
  }

  @Delete('me/addresses/:addressId')
  removeAddress(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Param('addressId') addressId: string,
  ) {
    return this.usersService.removeAddress(currentUser.id, addressId);
  }
}

