import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { LocalStorageProvider } from './providers/local-storage.provider';
import { MinioStorageProvider } from './providers/minio-storage.provider';

@Module({
  providers: [StorageService, LocalStorageProvider, MinioStorageProvider],
  exports: [StorageService],
})
export class StorageModule {}
