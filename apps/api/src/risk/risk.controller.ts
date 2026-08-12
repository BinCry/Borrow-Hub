import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import {
  CreateProhibitedAssetRuleDto,
  RiskIncidentQueryDto,
  UpdateProhibitedAssetRuleDto,
  UpdateRiskIncidentStatusDto,
} from './risk.dto';
import { RiskService } from './risk.service';

@Controller('risk')
export class RiskController {
  constructor(private readonly riskService: RiskService) {}

  @Roles(RoleName.MODERATOR, RoleName.CUSTOMER_SUPPORT, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('incidents')
  listIncidents(@Query() query: RiskIncidentQueryDto) {
    return this.riskService.listIncidents(query);
  }

  @Roles(RoleName.MODERATOR, RoleName.CUSTOMER_SUPPORT, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('incidents/:incidentId')
  getIncident(@Param('incidentId') incidentId: string) {
    return this.riskService.getIncident(incidentId);
  }

  @Roles(RoleName.MODERATOR, RoleName.CUSTOMER_SUPPORT, RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch('incidents/:incidentId/status')
  updateIncidentStatus(
    @Param('incidentId') incidentId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateRiskIncidentStatusDto,
  ) {
    return this.riskService.updateIncidentStatus(incidentId, currentUser, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Get('prohibited-rules')
  listProhibitedRules() {
    return this.riskService.listProhibitedRules();
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Post('prohibited-rules')
  createProhibitedRule(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: CreateProhibitedAssetRuleDto,
  ) {
    return this.riskService.createProhibitedRule(currentUser, dto);
  }

  @Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
  @Patch('prohibited-rules/:ruleId')
  updateProhibitedRule(
    @Param('ruleId') ruleId: string,
    @CurrentUser() currentUser: AuthenticatedUser,
    @Body() dto: UpdateProhibitedAssetRuleDto,
  ) {
    return this.riskService.updateProhibitedRule(ruleId, currentUser, dto);
  }
}
