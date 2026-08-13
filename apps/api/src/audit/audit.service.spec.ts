import { RequestContextService } from '../common/request-context.service';
import { PrismaService } from '../database/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const prisma = {
    auditLog: {
      create: jest.fn(),
    },
  };

  let requestContextService: RequestContextService;
  let service: AuditService;

  beforeEach(() => {
    jest.clearAllMocks();
    requestContextService = new RequestContextService();
    service = new AuditService(prisma as unknown as PrismaService, requestContextService);
    prisma.auditLog.create.mockResolvedValue({
      id: 'audit-1',
      action: 'test.action',
    });
  });

  it('falls back to the active request context metadata', async () => {
    await requestContextService.run(
      {
        requestId: 'req-1',
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      },
      async () => {
        await service.create({
          actorId: 'user-1',
          action: 'test.action',
          entityType: 'user',
          entityId: 'user-1',
        });
      },
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '127.0.0.1',
        userAgent: 'jest',
      }),
    });
  });

  it('prefers explicitly provided metadata over the request context', async () => {
    await requestContextService.run(
      {
        requestId: 'req-2',
        ipAddress: '10.0.0.1',
        userAgent: 'browser',
      },
      async () => {
        await service.create({
          actorId: 'user-1',
          action: 'test.action',
          entityType: 'user',
          entityId: 'user-1',
          ipAddress: '203.0.113.1',
          userAgent: 'mobile-app',
        });
      },
    );

    expect(prisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        ipAddress: '203.0.113.1',
        userAgent: 'mobile-app',
      }),
    });
  });
});
