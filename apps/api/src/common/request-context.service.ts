import { Injectable } from '@nestjs/common';
import { AsyncLocalStorage } from 'async_hooks';

export type RequestContextStore = {
  requestId: string;
  ipAddress?: string | null;
  userAgent?: string | null;
};

@Injectable()
export class RequestContextService {
  private readonly storage = new AsyncLocalStorage<RequestContextStore>();

  run<T>(context: RequestContextStore, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): RequestContextStore | undefined {
    return this.storage.getStore();
  }
}
