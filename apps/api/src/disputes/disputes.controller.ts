import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  AssignDisputeDto,
  CreateDisputeDto,
  DisputeQueryDto,
  RespondDisputeDto,
  UpdateDisputeStatusDto,
} from './disputes.dto';
import { DisputesService } from './disputes.service';

@Controller('disputes')
export class DisputesController {
  constructor(private readonly disputesService: DisputesService) {}

  @Get('my')
  listMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: DisputeQueryDto,
  ) {
    return this.disputesService.listMine(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateDisputeDto,
  ) {
    return this.disputesService.create(currentUser, dto);
  }

  @Get(':disputeId')
  getById(
    @Param('disputeId') disputeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.disputesService.getById(disputeId, currentUser);
  }

  @Post(':disputeId/respond')
  respond(
    @Param('disputeId') disputeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: RespondDisputeDto,
  ) {
    return this.disputesService.respond(disputeId, currentUser, dto);
  }

  @Patch(':disputeId/assign')
  assign(
    @Param('disputeId') disputeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AssignDisputeDto,
  ) {
    return this.disputesService.assign(disputeId, currentUser, dto);
  }

  @Patch(':disputeId/status')
  updateStatus(
    @Param('disputeId') disputeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateDisputeStatusDto,
  ) {
    return this.disputesService.updateStatus(disputeId, currentUser, dto);
  }
}
