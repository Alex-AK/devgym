import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import Database from 'better-sqlite3';

/** The slice of better-sqlite3 this workout uses. Every call is synchronous. */
export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: bigint | number };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

/**
 * What `db.transaction(fn)` hands back. Calling it runs `fn` between BEGIN and
 * COMMIT and rolls the whole thing back if `fn` throws. The three named forms
 * pick which BEGIN: `deferred` (the default) takes no lock until a statement
 * needs one, `immediate` takes the write lock before `fn` runs at all.
 */
export interface Transaction<A extends unknown[], R> {
  (...args: A): R;
  deferred(...args: A): R;
  immediate(...args: A): R;
  exclusive(...args: A): R;
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  transaction<A extends unknown[], R>(fn: (...args: A) => R): Transaction<A, R>;
  /** True while a transaction on this connection is open. */
  readonly inTransaction: boolean;
  /**
   * Test-only. Runs `fn` immediately before the next INSERT, UPDATE or DELETE
   * this connection executes, and the arming is spent. `skip` lets that many
   * writes past first. It is how a checkpoint puts a scan in the middle of a
   * manifest run. You do not need to call it.
   */
  beforeWrite(fn: () => void, skip?: number): void;
}

/**
 * Two connections to one depot database file, which is what two processes have.
 * `handheld` is the connection a scanner's requests go down; `office` is the one
 * the manifest run uses.
 */
export interface Depot {
  handheld: Db;
  office: Db;
  /** Closes both connections and deletes the file. */
  close(): void;
}

interface RawDb extends Db {
  pragma(source: string): unknown;
  close(): void;
}

const SCHEMA = `
  CREATE TABLE vans (
    id INTEGER PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    manifest_built_at TEXT,
    dispatched_at TEXT
  );

  CREATE TABLE parcels (
    id INTEGER PRIMARY KEY,
    barcode TEXT NOT NULL UNIQUE,
    postcode TEXT NOT NULL,
    weight_grams INTEGER NOT NULL,
    van_id INTEGER,
    status TEXT NOT NULL CHECK (status IN ('expected', 'at-depot'))
  );

  CREATE TABLE scans (
    id INTEGER PRIMARY KEY,
    parcel_id INTEGER NOT NULL,
    station TEXT NOT NULL,
    scanned_at TEXT NOT NULL
  );

  CREATE TABLE manifest_lines (
    id INTEGER PRIMARY KEY,
    van_id INTEGER NOT NULL,
    position INTEGER NOT NULL,
    parcel_id INTEGER NOT NULL,
    postcode TEXT NOT NULL
  );

  INSERT INTO vans (id, code, manifest_built_at, dispatched_at) VALUES
    (1, 'WX21 ABC', NULL, NULL),
    (2, 'WX21 DEF', '2026-03-02T05:40:00.000Z', '2026-03-02T06:15:00.000Z');

  INSERT INTO parcels (id, barcode, postcode, weight_grams, van_id, status) VALUES
    (1, 'PB-1001', 'BS3 4QT', 1200, 1, 'at-depot'),
    (2, 'PB-1002', 'BS1 6AA', 400, 1, 'at-depot'),
    (3, 'PB-1003', 'BS7 8NX', 2600, 1, 'at-depot'),
    (4, 'PB-1004', 'BS1 6AA', 900, 1, 'at-depot'),
    (5, 'PB-1005', 'BS5 9JD', 150, 1, 'at-depot'),
    (6, 'PB-1006', 'BS3 4QT', 3100, 1, 'expected'),
    (7, 'PB-1007', 'BS7 8NX', 700, 1, 'expected'),
    (8, 'PB-2001', 'BA1 2LP', 500, 2, 'at-depot');

  INSERT INTO manifest_lines (van_id, position, parcel_id, postcode) VALUES
    (2, 1, 8, 'BA1 2LP');
`;

const WRITE = /^\s*(insert|update|delete|replace)\b/i;

function instrument(db: RawDb): Db {
  let armed: { fn: () => void; skip: number } | null = null;
  const prepare = db.prepare.bind(db);

  db.prepare = (sql: string): Statement => {
    const statement = prepare(sql);
    const run = statement.run.bind(statement);
    statement.run = (...params: unknown[]) => {
      if (armed && WRITE.test(sql)) {
        if (armed.skip > 0) {
          armed.skip -= 1;
        } else {
          const { fn } = armed;
          armed = null;
          fn();
        }
      }
      return run(...params);
    };
    return statement;
  };

  db.beforeWrite = (fn: () => void, skip = 0) => {
    armed = { fn, skip };
  };

  return db;
}

/** A fresh depot database on disk, with two connections open on it. */
export function createDepot(): Depot {
  const dir = mkdtempSync(join(tmpdir(), 'hone-depot-'));
  const file = join(dir, 'depot.db');
  const handles: RawDb[] = [];

  const open = (): Db => {
    // `timeout` is better-sqlite3's name for `busy_timeout`, and it defaults to
    // 5000. Pinned to 0 here, which is SQLite's own default: a statement that
    // cannot get the lock is refused now rather than in five seconds.
    const raw = new Database(file, { timeout: 0 }) as unknown as RawDb;
    raw.pragma('journal_mode = WAL');
    handles.push(raw);
    return instrument(raw);
  };

  const office = open();
  office.exec(SCHEMA);
  const handheld = open();

  return {
    handheld,
    office,
    close() {
      for (const handle of handles) handle.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
