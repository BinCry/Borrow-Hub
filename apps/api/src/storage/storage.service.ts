import { Injectable } from '@nestjs/common';
import { IStorageProvider } from './storage.interface';
import { LocalStorageProvider } from './providers/local-storage.provider';

@Injectable()
export class StorageService {
  private provider: IStorageProvider;

  constructor(
    private readonly localProvider: LocalStorageProvider,
  ) {
    // In production, we would conditionally instantiate S3StorageProvider based on process.env.STORAGE_PROVIDER
    this.provider = this.localProvider;
  }

  async uploadAssetImage(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    return this.provider.uploadFile(`assets/${key}`, buffer, { contentType: mimeType, isPublic: true });
  }

  async uploadSensitiveDocument(key: string, buffer: Buffer, mimeType: string): Promise<string> {
    // E.g., KYC or handovers
    return this.provider.uploadFile(`secure/${key}`, buffer, { contentType: mimeType, isPublic: false });
  }

  async getSignedUrlForSensitiveDocument(key: string): Promise<string> {
    return this.provider.getSignedUrl(`secure/${key}`);
  }
}
