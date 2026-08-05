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
}

/**
 * Two connections to one booking database file, which is what two processes
 * have. `web` is the connection the public booking page uses; `desk` is the one
 * the front desk terminal uses.
 */
export interface Centre {
  web: Db;
  desk: Db;
  /** Closes both connections and deletes the file. */
  close(): void;
}

interface RawDb extends Db {
  pragma(source: string): unknown;
  close(): void;
}

const SCHEMA = `
  CREATE TABLE classes (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    starts_at TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    places_left INTEGER NOT NULL
  );

  CREATE TABLE bookings (
    id INTEGER PRIMARY KEY,
    class_id INTEGER NOT NULL,
    member_id INTEGER NOT NULL,
    state TEXT NOT NULL CHECK (state IN ('booked', 'cancelled')),
    booked_at TEXT NOT NULL
  );

  INSERT INTO classes (id, title, starts_at, capacity, places_left) VALUES
    (1, 'Beginners ceramics', '2026-03-07T10:00:00.000Z', 12, 2),
    (2, 'Life drawing', '2026-03-07T14:00:00.000Z', 8, 1),
    (3, 'Wheel throwing', '2026-03-08T10:00:00.000Z', 6, 0);

  INSERT INTO bookings (id, class_id, member_id, state, booked_at) VALUES
    (1, 1, 101, 'booked', '2026-02-24T09:12:00.000Z'),
    (2, 1, 102, 'booked', '2026-02-24T09:31:00.000Z'),
    (3, 1, 103, 'booked', '2026-02-24T11:02:00.000Z'),
    (4, 1, 104, 'booked', '2026-02-25T08:44:00.000Z'),
    (5, 1, 105, 'booked', '2026-02-25T19:20:00.000Z'),
    (6, 1, 106, 'booked', '2026-02-26T07:55:00.000Z'),
    (7, 1, 107, 'booked', '2026-02-26T12:10:00.000Z'),
    (8, 1, 108, 'booked', '2026-02-27T16:38:00.000Z'),
    (9, 1, 109, 'booked', '2026-02-28T09:05:00.000Z'),
    (10, 1, 110, 'booked', '2026-03-01T10:47:00.000Z'),
    (11, 2, 101, 'booked', '2026-02-24T09:14:00.000Z'),
    (12, 2, 103, 'booked', '2026-02-24T09:40:00.000Z'),
    (13, 2, 105, 'booked', '2026-02-25T13:02:00.000Z'),
    (14, 2, 107, 'booked', '2026-02-26T08:19:00.000Z'),
    (15, 2, 109, 'booked', '2026-02-27T10:26:00.000Z'),
    (16, 2, 111, 'booked', '2026-02-28T15:33:00.000Z'),
    (17, 2, 112, 'booked', '2026-03-01T09:58:00.000Z'),
    (18, 3, 102, 'booked', '2026-02-24T10:01:00.000Z'),
    (19, 3, 104, 'booked', '2026-02-24T10:22:00.000Z'),
    (20, 3, 106, 'booked', '2026-02-25T09:47:00.000Z'),
    (21, 3, 108, 'booked', '2026-02-26T11:15:00.000Z'),
    (22, 3, 110, 'booked', '2026-02-27T14:41:00.000Z'),
    (23, 3, 112, 'booked', '2026-02-28T08:30:00.000Z');
`;

/** A fresh booking database on disk, with two connections open on it. */
export function createCentre(): Centre {
  const dir = mkdtempSync(join(tmpdir(), 'hone-centre-'));
  const file = join(dir, 'bookings.db');
  const handles: RawDb[] = [];

  const open = (): Db => {
    // `timeout` is better-sqlite3's name for `busy_timeout`, and it defaults to
    // 5000. Pinned to 0 here, which is SQLite's own default: a statement that
    // cannot get the lock is refused now rather than in five seconds.
    const raw = new Database(file, { timeout: 0 }) as unknown as RawDb;
    raw.pragma('journal_mode = WAL');
    handles.push(raw);
    return raw;
  };

  const web = open();
  web.exec(SCHEMA);
  const desk = open();

  return {
    web,
    desk,
    close() {
      for (const handle of handles) handle.close();
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
