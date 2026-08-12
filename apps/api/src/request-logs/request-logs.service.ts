import { Injectable } from '@nestjs/common';
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
export class RequestLogsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
