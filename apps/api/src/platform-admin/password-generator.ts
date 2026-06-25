import { randomInt } from 'crypto';

export function generateTemporaryPassword(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let suffix = '';
  for (let i = 0; i < 6; i++) {
    suffix += alphabet[randomInt(0, alphabet.length)];
  }
  return `Rot-${suffix}`;
}
