import { Injectable } from '@nestjs/common';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { IStorageProvider } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly provider: IStorageProvider;

  constructor(localProvider: LocalStorageProvider) {
    this.provider = localProvider;
  }

  uploadAssetImage(key: string, buffer: Buffer, mimeType: string) {
    return this.provider.uploadFile(`assets/${key}`, buffer, {
      contentType: mimeType,
      isPublic: true,
    });
  }

  uploadSensitiveDocument(key: string, buffer: Buffer, mimeType: string) {
    return this.provider.uploadFile(`secure/${key}`, buffer, {
      contentType: mimeType,
      isPublic: false,
    });
  }

  getSignedUrlForSensitiveDocument(key: string) {
    const normalizedKey = key.startsWith('secure/') ? key : `secure/${key}`;
    return this.provider.getSignedUrl(normalizedKey);
  }

  deleteSensitiveDocument(key: string) {
    const normalizedKey = key.startsWith('secure/') ? key : `secure/${key}`;
    return this.provider.deleteFile(normalizedKey);
  }
}
