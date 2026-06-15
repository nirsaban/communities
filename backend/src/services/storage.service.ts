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
    // Logical folder hint — used by Cloudinary to partition assets
    // (e.g. 'profiles', 'events', 'communities'). Local driver ignores it.
    folder?: string;
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
    folder?: string;
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

class CloudinaryStorage implements StorageService {
  private readonly v2: typeof import('cloudinary').v2;
  constructor(creds: {
    cloud_name: string;
    api_key: string;
    api_secret: string;
  }) {
    // Lazy-require so non-cloudinary deployments don't pay the SDK init cost.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const cloudinary = require('cloudinary') as typeof import('cloudinary');
    cloudinary.v2.config({ ...creds, secure: true });
    this.v2 = cloudinary.v2;
  }

  async put({
    buffer,
    originalName,
    mimeType,
    folder,
  }: {
    buffer: Buffer;
    originalName: string;
    mimeType: string;
    folder?: string;
  }): Promise<StoredFile> {
    const ext = path.extname(originalName).replace(/^\./, '') || undefined;
    const cloudFolder = folder
      ? `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`
      : env.CLOUDINARY_UPLOAD_FOLDER;
    const resourceType = mimeType.startsWith('image/')
      ? 'image'
      : mimeType.startsWith('video/')
        ? 'video'
        : 'raw';
    // upload_stream takes a buffer — perfect for the multer.memoryStorage()
    // shape used by upload routes. Returns a Promise so callers stay async.
    const result = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const stream = this.v2.uploader.upload_stream(
        {
          folder: cloudFolder,
          resource_type: resourceType,
          format: ext,
          use_filename: false,
          unique_filename: true,
          overwrite: false,
        },
        (err, res) => {
          if (err) return reject(err);
          if (!res) return reject(new Error('Cloudinary returned no result'));
          resolve(res as unknown as Record<string, unknown>);
        },
      );
      stream.end(buffer);
    });
    return {
      url: String(result.secure_url ?? result.url),
      key: String(result.public_id),
      sizeBytes: Number(result.bytes ?? buffer.length),
      mimeType,
    };
  }
}

let instance: StorageService | null = null;

export function getStorageService(): StorageService {
  if (instance) return instance;
  switch (env.STORAGE_DRIVER) {
    case 'cloudinary': {
      if (
        !env.CLOUDINARY_CLOUD_NAME ||
        !env.CLOUDINARY_API_KEY ||
        !env.CLOUDINARY_API_SECRET
      ) {
        throw new Error(
          'STORAGE_DRIVER=cloudinary requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
        );
      }
      instance = new CloudinaryStorage({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
      });
      break;
    }
    case 'local':
    default:
      instance = new LocalDiskStorage(path.resolve(env.UPLOAD_DIR));
  }
  return instance;
}

export function _resetStorageService(svc: StorageService | null): void {
  instance = svc;
}
