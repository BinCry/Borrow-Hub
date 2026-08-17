export interface UploadOptions {
  contentType?: string;
  isPublic?: boolean;
}

export interface IStorageProvider {
  uploadFile(key: string, body: Buffer, options?: UploadOptions): Promise<string>;
  getSignedUrl(key: string, expiresInMinutes?: number): Promise<string>;
  deleteFile(key: string): Promise<void>;
}
