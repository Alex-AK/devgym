import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

/**
 * Resolve `apps/server` regardless of how the process was started (nest start,
 * `node dist/main.js`, tsx, vitest). We look for `nest-cli.json` walking up from
 * cwd, then try `apps/server` below cwd for repo-root invocations.
 */
function findServerRoot(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i += 1) {
    if (existsSync(join(dir, 'nest-cli.json'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const nested = join(process.cwd(), 'apps', 'server');
  if (existsSync(join(nested, 'nest-cli.json'))) return nested;
  return process.cwd();
}

export const SERVER_ROOT = findServerRoot();

export const DATA_DIR = process.env.DEVGYM_DATA_DIR ?? join(SERVER_ROOT, 'data');

export const APP_DB_PATH = join(DATA_DIR, 'app.db');

export const PRACTICE_DB_PATH = join(DATA_DIR, 'practice.db');

export const MIGRATIONS_DIR = join(SERVER_ROOT, 'drizzle');

export function ensureDataDir(): void {
  mkdirSync(DATA_DIR, { recursive: true });
}
