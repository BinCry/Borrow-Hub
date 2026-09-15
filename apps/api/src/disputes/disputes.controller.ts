import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  AcceptDamageReportDto,
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

  @Roles(
    RoleName.DISPUTE_OFFICER,
    RoleName.CUSTOMER_SUPPORT,
    RoleName.ADMIN,
    RoleName.SUPER_ADMIN,
  )
  @Get('admin')
  listForStaff(@Query() query: DisputeQueryDto) {
    return this.disputesService.listForStaff(query);
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

  @Post(':disputeId/accept-damage-report')
  acceptDamageReport(
    @Param('disputeId') disputeId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AcceptDamageReportDto,
  ) {
    return this.disputesService.acceptDamageReport(disputeId, currentUser, dto);
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
