import { RequestContextService } from './request-context.service';

describe('RequestContextService', () => {
  it('stores and returns the active request context', async () => {
    const service = new RequestContextService();

    await new Promise<void>((resolve) => {
      service.run(
        {
          requestId: 'req-1',
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        },
        () => {
          expect(service.get()).toEqual({
            requestId: 'req-1',
            ipAddress: '127.0.0.1',
            userAgent: 'jest',
          });
          resolve();
        },
      );
    });
  });

  it('returns undefined when no request context is active', () => {
    const service = new RequestContextService();

    expect(service.get()).toBeUndefined();
  });
});
