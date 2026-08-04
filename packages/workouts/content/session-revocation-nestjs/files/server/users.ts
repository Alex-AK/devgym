import { scryptSync, timingSafeEqual } from 'node:crypto';

export interface User {
  id: number;
  email: string;
  name: string;
  /** Stays on the server. It should never reach a response body. */
  passwordHash: string;
}

/**
 * Stored as `scrypt$<salt>$<derived>`. Real projects reach for argon2 or bcrypt;
 * scrypt is here because it ships with node and needs no build step. Hashing is
 * not what this workout is about.
 */
function hashPassword(plain: string, salt: string): string {
  return `scrypt$${salt}$${scryptSync(plain, salt, 32).toString('hex')}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const [scheme, salt, expected] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !expected) return false;

  const actual = scryptSync(plain, salt, 32).toString('hex');
  // Both are 32 bytes by construction, so the lengths always match.
  return timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}

const SEED = [
  { id: 1, email: 'nadia@example.com', name: 'Nadia Okoro', password: 'correct-horse' },
  { id: 2, email: 'raf@example.com', name: 'Raf Toledano', password: 'battery-staple' },
  { id: 3, email: 'iris@example.com', name: 'Iris Fenn', password: 'tr0ub4dour-and-3' },
];

/** Fixed salts keep the seeded hashes identical from run to run. */
const users: User[] = SEED.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: hashPassword(password, `salt-${rest.id}`),
}));

export function findUserByEmail(email: string): User | undefined {
  return users.find((user) => user.email === email.trim().toLowerCase());
}

export function findUserById(id: number): User | undefined {
  return users.find((user) => user.id === id);
}
