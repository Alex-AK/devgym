import Database from 'better-sqlite3';

/** One row of `idempotency_keys`. */
export interface KeyRecord {
  key: string;
  fingerprint: string;
  /** 'in_progress' while the payment is being made, 'done' once there is an answer to replay. */
  state: 'in_progress' | 'done';
  /** The status the first request answered with. Null until it has answered. */
  status_code: number | null;
  /** The body it answered with, as JSON text. Null until it has answered. */
  response: string | null;
}

/** The slice of better-sqlite3 this workout uses. Every call is synchronous. */
export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: number | bigint };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
}

/** A fresh in-memory database with the idempotency table already in it. */
export function createDb(): Db {
  const db: Db = new Database(':memory:');

  db.exec(`
    CREATE TABLE idempotency_keys (
      key TEXT PRIMARY KEY,
      fingerprint TEXT NOT NULL,
      state TEXT NOT NULL CHECK (state IN ('in_progress', 'done')),
      status_code INTEGER,
      response TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  return db;
}
