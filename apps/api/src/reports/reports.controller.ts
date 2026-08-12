import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  AssignReportDto,
  CreateReportDto,
  ReportQueryDto,
  UpdateReportStatusDto,
} from './reports.dto';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('my')
  listMine(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query() query: ReportQueryDto,
  ) {
    return this.reportsService.listMine(currentUser, query);
  }

  @Post()
  create(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateReportDto,
  ) {
    return this.reportsService.create(currentUser, dto);
  }

  @Get(':reportId')
  getById(
    @Param('reportId') reportId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    return this.reportsService.getById(reportId, currentUser);
  }

  @Patch(':reportId/assign')
  assign(
    @Param('reportId') reportId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: AssignReportDto,
  ) {
    return this.reportsService.assign(reportId, currentUser, dto);
  }

  @Patch(':reportId/status')
  updateStatus(
    @Param('reportId') reportId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportsService.updateStatus(reportId, currentUser, dto);
  }
}
