import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

import Database from 'better-sqlite3';
import { type BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import { APP_DB_PATH, MIGRATIONS_DIR } from '../common/paths';
import * as schema from './schema';

export type AppDb = BetterSQLite3Database<typeof schema>;

export interface AppDatabaseHandle {
  db: AppDb;
  sqlite: Database.Database;
}

export function openAppDatabase(path: string = APP_DB_PATH): AppDatabaseHandle {
  mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma('journal_mode = WAL');
  sqlite.pragma('foreign_keys = ON');
  return { db: drizzle(sqlite, { schema }), sqlite };
}

export function runMigrations(db: AppDb, migrationsFolder: string = MIGRATIONS_DIR): void {
  migrate(db, { migrationsFolder });
}

export { schema };
