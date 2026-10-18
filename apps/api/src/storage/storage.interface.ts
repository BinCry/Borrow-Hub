export interface UploadOptions {
  contentType?: string;
  isPublic?: boolean;
}

export interface IStorageProvider {
  uploadFile(key: string, body: Buffer, options?: UploadOptions): Promise<string>;
  readFile(key: string): Promise<Buffer>;
  getSignedUrl(key: string, expiresInMinutes?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
}
