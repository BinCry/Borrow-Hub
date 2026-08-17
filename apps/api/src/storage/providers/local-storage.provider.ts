import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { IStorageProvider, UploadOptions } from '../storage.interface';
import { resolve, dirname } from 'path';
import { mkdir, writeFile, unlink } from 'fs/promises';

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly storageRoot = resolve(process.cwd(), 'uploads');
  private readonly baseUrl = process.env.API_URL || 'http://localhost:3000'; // For local only

  async uploadFile(key: string, body: Buffer, _options?: UploadOptions): Promise<string> {
    try {
      const outputPath = resolve(this.storageRoot, key);
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, body);
      this.logger.debug(`File saved locally: ${key}`);
      return `${this.baseUrl}/files/${key}`; // We'll serve this securely via a controller later
    } catch (error) {
      this.logger.error(`Failed to upload file ${key}`, error);
      throw new InternalServerErrorException('File upload failed');
    }
  }

  async getSignedUrl(key: string, _expiresInMinutes = 60): Promise<string> {
    // In a real S3 scenario, this returns an AWS signed URL.
    // For local dev, we just return the endpoint that will verify JWT and serve the file.
    // Note: A true signed URL for local would involve generating a JWT token for the file key.
    return `${this.baseUrl}/files/signed/${key}`;
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const targetPath = resolve(this.storageRoot, key);
      await unlink(targetPath);
      this.logger.debug(`File deleted locally: ${key}`);
    } catch (error: any) {
      if (error.code !== 'ENOENT') {
        this.logger.error(`Failed to delete file ${key}`, error);
      }
    }
  }
}
