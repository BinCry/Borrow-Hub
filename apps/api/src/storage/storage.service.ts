import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { MinioStorageProvider } from './providers/minio-storage.provider';
import { IStorageProvider } from './storage.interface';

@Injectable()
export class StorageService {
  private readonly assetProvider: IStorageProvider;
  private readonly sensitiveProvider: IStorageProvider;

  constructor(
    configService: ConfigService,
    localProvider: LocalStorageProvider,
    minioProvider: MinioStorageProvider,
  ) {
    this.assetProvider =
      configService.get<string>('STORAGE_PROVIDER') === 'minio'
        ? minioProvider
        : localProvider;
    this.sensitiveProvider = localProvider;
  }

  uploadAssetImage(key: string, buffer: Buffer, mimeType: string) {
    return this.assetProvider.uploadFile(`assets/${key}`, buffer, {
      contentType: mimeType,
      isPublic: true,
    });
  }

  uploadSensitiveDocument(key: string, buffer: Buffer, mimeType: string) {
    return this.sensitiveProvider.uploadFile(`secure/${key}`, buffer, {
      contentType: mimeType,
      isPublic: false,
    });
  }

  getSignedUrlForSensitiveDocument(key: string) {
    const normalizedKey = key.startsWith('secure/') ? key : `secure/${key}`;
    return this.sensitiveProvider.getSignedUrl(normalizedKey);
  }

  deleteSensitiveDocument(key: string) {
    const normalizedKey = key.startsWith('secure/') ? key : `secure/${key}`;
    return this.sensitiveProvider.deleteFile(normalizedKey);
  }
}
