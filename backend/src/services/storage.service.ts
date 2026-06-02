import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import env from '../config/env';

export interface StoredFile {
  url: string;
  key: string;
  sizeBytes: number;
  mimeType: string;
}

export interface StorageService {
  put(input: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StoredFile>;
}

class LocalDiskStorage implements StorageService {
  constructor(private readonly baseDir: string) {}

  async put({
    buffer,
    originalName,
    mimeType,
  }: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
  }): Promise<StoredFile> {
    await fs.mkdir(this.baseDir, { recursive: true });
    const ext = path.extname(originalName) || '';
    const safeBase = path
      .basename(originalName, ext)
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .slice(0, 80);
    const key = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeBase}${ext}`;
    const absPath = path.join(this.baseDir, key);
    await fs.writeFile(absPath, buffer);
    return {
      url: `${env.API_BASE_URL}/uploads/${encodeURIComponent(key)}`,
      key,
      sizeBytes: buffer.length,
      mimeType,
    };
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (instance) return instance;
  switch (env.STORAGE_DRIVER) {
    case 'local':
    default:
      instance = new LocalDiskStorage(path.resolve(env.UPLOAD_DIR));
  }
  return instance;
}

export function _resetStorageService(svc: StorageService | null): void {
  instance = svc;
}
