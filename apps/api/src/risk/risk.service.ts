import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  RiskIncidentStatus,
  RiskLevel,
  RiskTargetType,
} from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-request.interface';
import { PrismaService } from '../database/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateProhibitedAssetRuleDto,
  RiskIncidentQueryDto,
  UpdateProhibitedAssetRuleDto,
  UpdateRiskIncidentStatusDto,
} from './risk.dto';

type AssetRiskInput = {
  assetId: string;
  ownerId: string;
  title: string;
  description: string;
  brand?: string | null;
  model?: string | null;
  estimatedValue: number;
};

type RentalRiskInput = {
  rentalId: string;
  renterId: string;
  ownerId: string;
  assetId: string;
  assetTitle: string;
  assetEstimatedValue: number;
};

@Injectable()
export class RiskService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  listIncidents(query: RiskIncidentQueryDto) {
    return this.prisma.riskIncident.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.level ? { level: query.level } : {}),
        ...(query.targetType ? { targetType: query.targetType } : {}),
      },
      orderBy: [{ createdAt: 'desc' }],
    });
  }

  async getIncident(incidentId: string) {
    const incident = await this.prisma.riskIncident.findUnique({
      where: { id: incidentId },
    });

    if (!incident) {
      throw new NotFoundException('Risk incident not found');
    }

    return incident;
  }

  async updateIncidentStatus(
    incidentId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateRiskIncidentStatusDto,
  ) {
    const incident = await this.getIncident(incidentId);

    const updated = await this.prisma.riskIncident.update({
      where: { id: incident.id },
      data: {
        status: dto.status,
        resolutionSummary: dto.resolutionSummary ?? incident.resolutionSummary,
        resolvedById:
          dto.status === RiskIncidentStatus.RESOLVED ||
          dto.status === RiskIncidentStatus.DISMISSED
            ? currentUser.id
            : null,
        resolvedAt:
          dto.status === RiskIncidentStatus.RESOLVED ||
          dto.status === RiskIncidentStatus.DISMISSED
            ? new Date()
            : null,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'risk.incident.status.update',
      entityType: 'risk_incident',
      entityId: updated.id,
      beforeData: { status: incident.status },
      afterData: {
        status: updated.status,
        resolutionSummary: updated.resolutionSummary,
      },
    });

    return updated;
  }

  listProhibitedRules() {
    return this.prisma.prohibitedAssetRule.findMany({
      orderBy: [{ keyword: 'asc' }],
    });
  }

  async createProhibitedRule(
    currentUser: AuthenticatedUser,
    dto: CreateProhibitedAssetRuleDto,
  ) {
    const existing = await this.prisma.prohibitedAssetRule.findFirst({
      where: {
        keyword: {
          equals: dto.keyword,
          mode: 'insensitive',
        },
      },
    });

    if (existing) {
      throw new ConflictException('A prohibited asset rule with this keyword already exists');
    }

    const rule = await this.prisma.prohibitedAssetRule.create({
      data: {
        keyword: dto.keyword,
        reason: dto.reason,
        categoryHint: dto.categoryHint,
        createdById: currentUser.id,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'risk.prohibited-rule.create',
      entityType: 'prohibited_asset_rule',
      entityId: rule.id,
      afterData: {
        keyword: rule.keyword,
        reason: rule.reason,
      },
    });

    return rule;
  }

  async updateProhibitedRule(
    ruleId: string,
    currentUser: AuthenticatedUser,
    dto: UpdateProhibitedAssetRuleDto,
  ) {
    const existing = await this.prisma.prohibitedAssetRule.findUnique({
      where: { id: ruleId },
    });

    if (!existing) {
      throw new NotFoundException('Prohibited asset rule not found');
    }

    const updated = await this.prisma.prohibitedAssetRule.update({
      where: { id: ruleId },
      data: {
        keyword: dto.keyword,
        reason: dto.reason,
        categoryHint: dto.categoryHint,
        isActive: dto.isActive,
      },
    });

    await this.auditService.create({
      actorId: currentUser.id,
      action: 'risk.prohibited-rule.update',
      entityType: 'prohibited_asset_rule',
      entityId: updated.id,
      beforeData: {
        keyword: existing.keyword,
        isActive: existing.isActive,
      },
      afterData: {
        keyword: updated.keyword,
        isActive: updated.isActive,
      },
    });

    return updated;
  }

  async assessAssetSubmission(input: AssetRiskInput) {
    const [rules, owner] = await this.prisma.$transaction([
      this.prisma.prohibitedAssetRule.findMany({
        where: { isActive: true },
      }),
      this.prisma.user.findUniqueOrThrow({
        where: { id: input.ownerId },
        select: {
          id: true,
          createdAt: true,
          fullName: true,
        },
      }),
    ]);

    const normalized = [
      input.title,
      input.description,
      input.brand,
      input.model,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    const matchedRules = rules.filter((rule) =>
      normalized.includes(rule.keyword.toLowerCase()),
    );

    if (matchedRules.length > 0) {
      await this.createIncidentIfAbsent({
        targetType: RiskTargetType.ASSET,
        targetId: input.assetId,
        level: RiskLevel.HIGH,
        title: 'Potential prohibited asset listing',
        reason: matchedRules.map((rule) => `${rule.keyword}: ${rule.reason}`).join('; '),
        metadata: {
          matchedRuleIds: matchedRules.map((rule) => rule.id),
          matchedKeywords: matchedRules.map((rule) => rule.keyword),
        },
      });
    }

    const riskNewAccountDays = await this.getNumericConfig('risk_new_account_days', 30);
    const maxNewUserAssetValue = await this.getNumericConfig(
      'max_new_user_asset_value',
      3000000,
    );
    const accountAgeDays =
      (Date.now() - owner.createdAt.getTime()) / (24 * 60 * 60 * 1000);

    if (
      accountAgeDays <= riskNewAccountDays &&
      input.estimatedValue > maxNewUserAssetValue
    ) {
      await this.createIncidentIfAbsent({
        targetType: RiskTargetType.ASSET,
        targetId: input.assetId,
        level: RiskLevel.HIGH,
        title: 'High-value asset from recently created account',
        reason: `Account age ${Math.floor(accountAgeDays)} day(s), asset value ${input.estimatedValue}`,
        metadata: {
          accountAgeDays,
          estimatedValue: input.estimatedValue,
          threshold: maxNewUserAssetValue,
        },
      });
    }
  }

  async assessRentalCreation(input: RentalRiskInput) {
    const renter = await this.prisma.user.findUniqueOrThrow({
      where: { id: input.renterId },
      select: {
        createdAt: true,
      },
    });

    const riskNewAccountDays = await this.getNumericConfig('risk_new_account_days', 30);
    const maxNewUserAssetValue = await this.getNumericConfig(
      'max_new_user_asset_value',
      3000000,
    );
    const accountAgeDays =
      (Date.now() - renter.createdAt.getTime()) / (24 * 60 * 60 * 1000);

    if (
      accountAgeDays <= riskNewAccountDays &&
      input.assetEstimatedValue > maxNewUserAssetValue
    ) {
      await this.createIncidentIfAbsent({
        targetType: RiskTargetType.RENTAL,
        targetId: input.rentalId,
        level: RiskLevel.HIGH,
        title: 'High-risk rental created by recently created account',
        reason: `Renter account age ${Math.floor(accountAgeDays)} day(s) booking high-value asset "${input.assetTitle}"`,
        metadata: {
          renterId: input.renterId,
          assetId: input.assetId,
          estimatedValue: input.assetEstimatedValue,
          threshold: maxNewUserAssetValue,
        },
      });
    }
  }

  async assessCancellationPattern(rentalId: string, renterId: string) {
    const threshold = await this.getNumericConfig('risk_cancel_threshold', 3);
    const lookbackDays = await this.getNumericConfig('risk_cancel_lookback_days', 30);
    const fromDate = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const cancelCount = await this.prisma.rentalRequest.count({
      where: {
        renterId,
        status: 'CANCELLED',
        updatedAt: {
          gte: fromDate,
        },
      },
    });

    if (cancelCount >= threshold) {
      await this.createIncidentIfAbsent({
        targetType: RiskTargetType.RENTAL,
        targetId: rentalId,
        level: RiskLevel.MEDIUM,
        title: 'Repeated booking cancellations detected',
        reason: `Renter cancelled ${cancelCount} booking(s) in the last ${lookbackDays} day(s)`,
        metadata: {
          renterId,
          cancelCount,
          threshold,
          lookbackDays,
        },
      });
    }
  }

  private async createIncidentIfAbsent(input: {
    targetType: RiskTargetType;
    targetId: string;
    level: RiskLevel;
    title: string;
    reason: string;
    metadata?: Prisma.InputJsonValue;
  }) {
    const existing = await this.prisma.riskIncident.findFirst({
      where: {
        targetType: input.targetType,
        targetId: input.targetId,
        title: input.title,
        status: {
          in: [RiskIncidentStatus.OPEN, RiskIncidentStatus.UNDER_REVIEW],
        },
      },
    });

    if (existing) {
      return existing;
    }

    const incident = await this.prisma.riskIncident.create({
      data: {
        targetType: input.targetType,
        targetId: input.targetId,
        level: input.level,
        title: input.title,
        reason: input.reason,
        metadata: input.metadata,
      },
    });

    await this.auditService.create({
      action: 'risk.incident.create',
      entityType: 'risk_incident',
      entityId: incident.id,
      afterData: {
        targetType: incident.targetType,
        targetId: incident.targetId,
        level: incident.level,
        title: incident.title,
      },
    });

    await this.notificationsService.createMany([], {
      type: NotificationType.SYSTEM,
      title: 'Risk incident created',
      content: incident.title,
      referenceType: 'risk',
      referenceId: incident.id,
    });

    return incident;
  }

  private async getNumericConfig(key: string, fallback: number) {
    const config = await this.prisma.systemConfig.findUnique({
      where: { key },
    });

    return config ? Number(config.value) : fallback;
  }
}
