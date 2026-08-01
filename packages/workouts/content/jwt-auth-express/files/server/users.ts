import { hashPassword } from './passwords';

export interface User {
  id: number;
  email: string;
  name: string;
  /** Stays on the server. It should never reach a response body. */
  passwordHash: string;
}

const SEED = [
  { id: 1, email: 'ada@example.com', name: 'Ada Bell', password: 'correct-horse' },
  { id: 2, email: 'bruno@example.com', name: 'Bruno Vale', password: 'battery-staple' },
  { id: 3, email: 'cara@example.com', name: 'Cara Nix', password: 'tr0ub4dour-and-3' },
];

/** Fixed salts keep the seeded hashes identical from run to run. */
const users: User[] = SEED.map(({ password, ...rest }) => ({
  ...rest,
  passwordHash: hashPassword(password, `salt-${rest.id}`),
}));

export function findUserByEmail(email: string): User | undefined {
  const wanted = email.trim().toLowerCase();
  return users.find((user) => user.email === wanted);
}

export function findUserById(id: number): User | undefined {
  return users.find((user) => user.id === id);
}
