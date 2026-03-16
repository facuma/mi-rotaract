import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { StorageAdapter, UploadParams } from './storage.interface';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'mi-rotaract-attachments';
const PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || null;

const r2Config = {
  region: 'auto' as const,
  endpoint: `https://${ACCOUNT_ID || ''}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID || '',
    secretAccessKey: SECRET_ACCESS_KEY || '',
  },
};

let r2Client: S3Client | null = null;

function getR2Client(): S3Client {
  if (!r2Client) {
    r2Client = new S3Client(r2Config);
  }
  return r2Client;
}

function getPublicUrl(key: string): string | null {
  if (!PUBLIC_BASE_URL) return null;
  const cleanKey = key.startsWith('/') ? key.slice(1) : key;
  const cleanBase = PUBLIC_BASE_URL.endsWith('/') ? PUBLIC_BASE_URL.slice(0, -1) : PUBLIC_BASE_URL;
  return `${cleanBase}/${cleanKey}`;
}

export class R2StorageAdapter implements StorageAdapter {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = getR2Client();
    this.bucket = BUCKET_NAME;
  }

  async upload(params: UploadParams): Promise<void> {
    const { key, body, contentType } = params;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    try {
      await this.client.send(command);
    } catch {
      // Idempotent: ignore if object doesn't exist
    }
  }

  async getStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    const response = await this.client.send(command);
    const body = response.Body;
    if (!body || !(body instanceof Readable)) {
      throw new Error('Archivo no encontrado en almacenamiento');
    }
    return body;
  }

  getPublicUrl(key: string): string | null {
    return getPublicUrl(key);
  }
}
