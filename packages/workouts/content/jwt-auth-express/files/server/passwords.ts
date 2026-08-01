import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

/**
 * Stored as `scrypt$<salt>$<derived>`. Real projects reach for argon2 or bcrypt;
 * scrypt is here because it ships with node and needs no build step.
 */
export function hashPassword(plain: string, salt = randomBytes(8).toString('hex')): string {
  return `scrypt$${salt}$${scryptSync(plain, salt, 32).toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;

  const actual = scryptSync(plain, salt, 32).toString('hex');
  // Both are 32 bytes by construction, so the lengths always match.
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
