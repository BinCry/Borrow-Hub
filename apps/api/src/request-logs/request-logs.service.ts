import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import { RequestLogQueryDto } from './request-logs.dto';

type CreateRequestLogInput = {
  requestId: string;
  userId?: string | null;
  method: string;
  endpoint: string;
  statusCode: number;
  latencyMs: number;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class RequestLogsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RequestLogsService.name);
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService?: ConfigService,
  ) {}

  onModuleInit() {
    void this.pruneExpiredLogs();
    this.cleanupTimer = setInterval(
      () => void this.pruneExpiredLogs(),
      6 * 60 * 60 * 1000,
    );
    this.cleanupTimer.unref();
  }

  onModuleDestroy() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  create(input: CreateRequestLogInput) {
    return this.prisma.requestLog.create({
      data: {
        requestId: input.requestId,
        userId: input.userId ?? null,
        method: input.method,
        endpoint: input.endpoint,
        statusCode: input.statusCode,
        latencyMs: input.latencyMs,
        ipAddress: input.ipAddress ?? null,
        userAgent: input.userAgent ?? null,
      },
    });
  }

  list(query: RequestLogQueryDto) {
    const where: Prisma.RequestLogWhereInput = {
      ...(query.requestId ? { requestId: query.requestId } : {}),
      ...(query.userId ? { userId: query.userId } : {}),
      ...(query.method ? { method: query.method.toUpperCase() } : {}),
      ...(query.statusCode ? { statusCode: query.statusCode } : {}),
      ...(query.endpointContains
        ? {
            endpoint: {
              contains: query.endpointContains,
              mode: 'insensitive',
            },
          }
        : {}),
    };

    return this.prisma.requestLog.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: query.limit ?? 100,
    });
  }

  private async pruneExpiredLogs() {
    const retentionDays =
      this.configService?.get<number>('REQUEST_LOG_RETENTION_DAYS') ?? 30;
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    try {
      const result = await this.prisma.requestLog.deleteMany({
        where: {
          createdAt: {
            lt: cutoff,
          },
        },
      });

      if (result.count > 0) {
        this.logger.log(`Pruned ${result.count} expired request logs`);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Request log retention cleanup failed: ${message}`);
    }
  }
}
