import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

const SECRET = () => process.env.QR_SIGNING_SECRET || 'dev-qr-secret-change-me';

function base64url(buf: Buffer): string {
  return buf
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function sign(id: string): string {
  return createHmac('sha256', SECRET()).update(id).digest('hex');
}

export function generateCheckInToken(): string {
  const id = base64url(randomBytes(24));
  return `${id}.${sign(id)}`;
}

export function verifyCheckInToken(token: string): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [id, sig] = parts;
  if (!id || !sig) return false;
  const expected = sign(id);
  if (expected.length !== sig.length) return false;
  try {
    return timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(sig, 'hex'));
  } catch {
    return false;
  }
}
