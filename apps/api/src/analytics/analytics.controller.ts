import { Controller, Get, Query } from '@nestjs/common';
import { RoleName } from '@prisma/client';
import { Roles } from '../common/decorators/roles.decorator';
import { AnalyticsEventsQueryDto, AnalyticsSummaryQueryDto } from './analytics.dto';
import { AnalyticsService } from './analytics.service';

@Roles(RoleName.ADMIN, RoleName.SUPER_ADMIN)
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('events')
  list(@Query() query: AnalyticsEventsQueryDto) {
    return this.analyticsService.list(query);
  }

  @Get('summary')
  summary(@Query() query: AnalyticsSummaryQueryDto) {
    return this.analyticsService.summary(query);
  }
}
