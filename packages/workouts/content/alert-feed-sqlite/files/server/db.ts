import Database from 'better-sqlite3';

/** The slice of better-sqlite3 this workout uses. Every call is synchronous. */
export interface Statement {
  run(...params: unknown[]): { changes: number; lastInsertRowid: bigint | number };
  get<T = unknown>(...params: unknown[]): T | undefined;
  all<T = unknown>(...params: unknown[]): T[];
}

export interface Db {
  prepare(sql: string): Statement;
  exec(sql: string): void;
  /** Runs `fn` between BEGIN and COMMIT, and rolls it back if `fn` throws. */
  transaction<A extends unknown[], R>(fn: (...args: A) => R): (...args: A) => R;
}

const SCHEMA = `
  CREATE TABLE alerts (
    id INTEGER PRIMARY KEY,
    service TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('firing', 'acknowledged')),
    created_at TEXT NOT NULL
  );

  CREATE INDEX alerts_feed_idx ON alerts (status, created_at DESC, id DESC);
`;

const SERVICES = [
  'checkout-api',
  'billing-worker',
  'search-indexer',
  'auth-api',
  'mailer',
  'cdn-edge',
  'db-primary',
];

const MESSAGES = [
  'p99 latency over 2s',
  '5xx rate above 1%',
  'queue depth over 10k',
  'disk 91% full',
  'certificate expires in 3 days',
  'replication lag 45s',
  'health check failed three times',
  'memory over 90%',
  'error budget burning 4x',
  'no data for 5 minutes',
  'connection pool exhausted',
];

const ALERT_COUNT = 600;
const BURST_SIZE = 30;
const FIRST_ALERT_AT = Date.UTC(2026, 2, 2, 8, 0, 0);
const SEVEN_MINUTES = 7 * 60 * 1000;

/**
 * The night checkout-api flapped: the notifier fanned out thirty alerts in one
 * write, so all thirty carry this timestamp to the millisecond.
 */
export const BURST_CREATED_AT = new Date(
  FIRST_ALERT_AT + 555 * SEVEN_MINUTES + 3 * 60 * 1000
).toISOString();

/**
 * A fresh in-memory database with 630 alerts in it, 230 of them still firing.
 * Seeded identically every time.
 */
export function createDb(): Db {
  const db = new Database(':memory:') as unknown as Db;
  db.exec(SCHEMA);

  const insert = db.prepare(
    'INSERT INTO alerts (id, service, message, status, created_at) VALUES (?, ?, ?, ?, ?)'
  );

  const seed = db.transaction(() => {
    for (let i = 1; i <= ALERT_COUNT; i += 1) {
      insert.run(
        i,
        SERVICES[i % SERVICES.length],
        MESSAGES[i % MESSAGES.length],
        i % 3 === 0 ? 'firing' : 'acknowledged',
        new Date(FIRST_ALERT_AT + i * SEVEN_MINUTES).toISOString()
      );
    }
    for (let i = 1; i <= BURST_SIZE; i += 1) {
      insert.run(
        ALERT_COUNT + i,
        'checkout-api',
        `health check failed on instance ${i}`,
        'firing',
        BURST_CREATED_AT
      );
    }
  });
  seed();

  return db;
}

/**
 * Test-only. The checkpoints call these between two page reads, the way the feed
 * moves while somebody is working through it. You do not need to call them.
 */
export function addAlert(
  db: Db,
  alert: { service: string; message: string; createdAt: string }
): number {
  const result = db
    .prepare("INSERT INTO alerts (service, message, status, created_at) VALUES (?, ?, 'firing', ?)")
    .run(alert.service, alert.message, alert.createdAt);
  return Number(result.lastInsertRowid);
}

export function acknowledgeAlert(db: Db, id: number): void {
  db.prepare("UPDATE alerts SET status = 'acknowledged' WHERE id = ?").run(id);
}

/** Every alert still firing, newest first. */
export function firingAlertIds(db: Db): number[] {
  return db
    .prepare("SELECT id FROM alerts WHERE status = 'firing' ORDER BY created_at DESC, id DESC")
    .all<{ id: number }>()
    .map((row) => row.id);
}
