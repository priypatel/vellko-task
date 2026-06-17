import bcrypt from 'bcryptjs';
import { createHash } from 'node:crypto';

const BCRYPT_COST = 12;

/**
 * Hash a plaintext password with bcrypt (cost factor 12).
 */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

/**
 * Compare a plaintext password against a stored bcrypt hash.
 */
export function comparePassword(
  plain: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/**
 * SHA-256 digest of a buffer (or string), returned as a lowercase hex string.
 * Used for file integrity hashes and hashing tokens before storage.
 */
export function sha256(input: Buffer | string): string {
  return createHash('sha256').update(input).digest('hex');
}
