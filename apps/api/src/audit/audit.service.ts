import { Injectable } from '@nestjs/common';
import { Prisma, AuditLog } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';

type CreateAuditLogInput = {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  beforeData?: Prisma.InputJsonValue | null;
  afterData?: Prisma.InputJsonValue | null;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  create(entry: CreateAuditLogInput): Promise<AuditLog> {
    const data: Prisma.AuditLogUncheckedCreateInput = {
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId ?? null,
      beforeData: entry.beforeData ?? undefined,
      afterData: entry.afterData ?? undefined,
      ipAddress: entry.ipAddress ?? null,
      userAgent: entry.userAgent ?? null,
    };

    return this.prisma.auditLog.create({
      data,
    });
  }

  findLatest(limit = 100): Promise<AuditLog[]> {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
