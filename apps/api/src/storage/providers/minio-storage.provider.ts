import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';
import { isAbsolute } from 'path';
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
export class MinioStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(MinioStorageProvider.name);
  private client?: Client;
  private bucket?: string;
  private region?: string;
  private publicBaseUrl?: string;
  private bucketReady?: Promise<void>;

  constructor(private readonly configService: ConfigService) {}

  private getConfig() {
    if (this.client && this.bucket && this.region && this.publicBaseUrl) {
      return {
        client: this.client,
        bucket: this.bucket,
        region: this.region,
        publicBaseUrl: this.publicBaseUrl,
      };
    }

    const endPoint = this.configService.getOrThrow<string>('MINIO_ENDPOINT');
    const port = this.configService.get<number>('MINIO_PORT');
    const useSSL = this.configService.get<boolean>('MINIO_USE_SSL') ?? false;

    this.bucket = this.configService.getOrThrow<string>('MINIO_BUCKET');
    this.region = this.configService.get<string>('MINIO_REGION') ?? 'us-east-1';
    this.publicBaseUrl = (
      this.configService.get<string>('MINIO_PUBLIC_BASE_URL') ??
      `${useSSL ? 'https' : 'http'}://${endPoint}${port ? `:${port}` : ''}`
    ).replace(/\/$/, '');

    this.client = new Client({
      endPoint,
      port,
      useSSL,
      accessKey: this.configService.getOrThrow<string>('MINIO_ACCESS_KEY'),
      secretKey: this.configService.getOrThrow<string>('MINIO_SECRET_KEY'),
      region: this.region,
    });

    return {
      client: this.client,
      bucket: this.bucket,
      region: this.region,
      publicBaseUrl: this.publicBaseUrl,
    };
  }

  async uploadFile(
    key: string,
    body: Buffer,
    options?: UploadOptions,
  ): Promise<string> {
    const normalizedKey = normalizeStorageKey(key);

    try {
      await this.ensureBucket();
      const { client, bucket, publicBaseUrl } = this.getConfig();
      await client.putObject(
        bucket,
        normalizedKey,
        body,
        body.length,
        {
          'Content-Type': options?.contentType ?? 'application/octet-stream',
        },
      );
      this.logger.debug(`File saved to MinIO: ${normalizedKey}`);

      if (options?.isPublic) {
        return `${publicBaseUrl}/${bucket}/${this.encodePath(normalizedKey)}`;
      }

      return normalizedKey;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to upload file to MinIO: ${message}`);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async getSignedUrl(key: string, expiresInMinutes = 60): Promise<string> {
    const normalizedKey = normalizeStorageKey(key);

    if (!normalizedKey.startsWith('secure/')) {
      throw new BadRequestException('Only secure files can use signed URLs');
    }

    await this.ensureBucket();
    const { client, bucket } = this.getConfig();
    return client.presignedGetObject(
      bucket,
      normalizedKey,
      Math.min(Math.max(expiresInMinutes, 1), 24 * 60) * 60,
    );
  }

  async deleteFile(key: string): Promise<void> {
    const normalizedKey = normalizeStorageKey(key);

    try {
      await this.ensureBucket();
      const { client, bucket } = this.getConfig();
      await client.removeObject(bucket, normalizedKey);
      this.logger.debug(`File deleted from MinIO: ${normalizedKey}`);
    } catch (error: unknown) {
      const code =
        typeof error === 'object' && error !== null && 'code' in error
          ? error.code
          : undefined;

      if (code !== 'NoSuchKey' && code !== 'NotFound') {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.logger.error(`Failed to delete file from MinIO: ${message}`);
        throw new InternalServerErrorException('File deletion failed');
      }
    }
  }

  private ensureBucket() {
    this.bucketReady ??= this.createBucketIfNeeded();
    return this.bucketReady;
  }

  private async createBucketIfNeeded() {
    const { client, bucket, region } = this.getConfig();
    const exists = await client.bucketExists(bucket);

    if (!exists) {
      await client.makeBucket(bucket, region);
    }

    await client.setBucketPolicy(
      bucket,
      JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: { AWS: ['*'] },
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${bucket}/assets/*`],
          },
        ],
      }),
    );
  }

  private encodePath(key: string) {
    return key.split('/').map(encodeURIComponent).join('/');
  }
}
