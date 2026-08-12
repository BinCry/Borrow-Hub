import { RequestLogsService } from './request-logs.service';

describe('RequestLogsService', () => {
  const prisma = {
    requestLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  let service: RequestLogsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new RequestLogsService(prisma as never);
  });

  it('creates a sanitized request log entry', async () => {
    prisma.requestLog.create.mockResolvedValue({
      id: 'log-1',
      requestId: 'req-1',
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      statusCode: 201,
      latencyMs: 45,
    });

    const result = await service.create({
      requestId: 'req-1',
      userId: 'user-1',
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      statusCode: 201,
      latencyMs: 45,
      ipAddress: '127.0.0.1',
      userAgent: 'jest',
    });

    expect(prisma.requestLog.create).toHaveBeenCalledWith({
      data: {
        requestId: 'req-1',
        userId: 'user-1',
        method: 'POST',
        endpoint: '/api/v1/auth/login',
        statusCode: 201,
        latencyMs: 45,
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
    });
    expect(result.id).toBe('log-1');
  });

  it('filters request logs by endpoint and method', async () => {
    prisma.requestLog.findMany.mockResolvedValue([{ id: 'log-2' }]);

    const result = await service.list({
      method: 'get',
      endpointContains: '/analytics',
      limit: 50,
    });

    expect(prisma.requestLog.findMany).toHaveBeenCalledWith({
      where: {
        method: 'GET',
        endpoint: {
          contains: '/analytics',
          mode: 'insensitive',
        },
      },
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
      take: 50,
    });
    expect(result).toEqual([{ id: 'log-2' }]);
  });
});
