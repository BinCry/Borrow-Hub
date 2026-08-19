import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { mkdir, unlink, writeFile } from 'fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'path';
import { IStorageProvider, UploadOptions } from '../storage.interface';

function normalizeStorageKey(key: string) {
  const normalized = key.replace(/\\/g, '/').replace(/^\/+/, '');

  if (
    normalized.length === 0 ||
    isAbsolute(key) ||
    normalized.split('/').some((segment) => segment === '..' || segment === '')
  ) {
    throw new BadRequestException('Invalid storage key');
  }

  return normalized;
}

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly storageRoot: string;
  private readonly baseUrl: string;
  private readonly signingSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.storageRoot = resolve(
      this.configService.get<string>('UPLOADS_DIR') ??
        resolve(process.cwd(), 'uploads'),
    );
    this.baseUrl = this.configService.getOrThrow<string>('APP_URL');
    this.signingSecret =
      this.configService.get<string>('STORAGE_SIGNING_SECRET') ??
      this.configService.getOrThrow<string>('JWT_ACCESS_SECRET');
  }

  async uploadFile(
    key: string,
    body: Buffer,
    options?: UploadOptions,
  ): Promise<string> {
    const normalizedKey = normalizeStorageKey(key);
    const outputPath = this.resolveStoragePath(normalizedKey);

    try {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, body, { flag: 'wx' });
      this.logger.debug(`File saved locally: ${normalizedKey}`);

      if (options?.isPublic) {
        const publicKey = normalizedKey.replace(/^assets\//, '');
        return `${this.baseUrl}/files/assets/${this.encodePath(publicKey)}`;
      }

      return normalizedKey;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file: ${message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async getSignedUrl(key: string, expiresInMinutes = 60): Promise<string> {
    const normalizedKey = normalizeStorageKey(key);

    if (!normalizedKey.startsWith('secure/')) {
      throw new BadRequestException('Only secure files can use signed URLs');
    }

    const expires = Math.floor(Date.now() / 1000) + expiresInMinutes * 60;
    const signature = createHmac('sha256', this.signingSecret)
      .update(`${normalizedKey}:${expires}`)
      .digest('hex');

    return `${this.baseUrl}/files/signed?key=${encodeURIComponent(normalizedKey)}&expires=${expires}&signature=${signature}`;
  }

  async deleteFile(key: string): Promise<void> {
    const normalizedKey = normalizeStorageKey(key);
    const targetPath = this.resolveStoragePath(normalizedKey);

    try {
      await unlink(targetPath);
      this.logger.debug(`File deleted locally: ${normalizedKey}`);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;

      if (code !== 'ENOENT') {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to delete file: ${message}`);
        throw new InternalServerErrorException('File deletion failed');
      }
    }
  }

  private resolveStoragePath(key: string) {
    const targetPath = resolve(this.storageRoot, key);
    const relativePath = relative(this.storageRoot, targetPath);

    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new BadRequestException('Invalid storage key');
    }

    return targetPath;
  }

  private encodePath(key: string) {
    return key.split('/').map(encodeURIComponent).join('/');
  }
}
