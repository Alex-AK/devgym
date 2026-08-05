import { randomBytes } from 'node:crypto';

import { Client } from 'pg';

/**
 * The shop's `orders` table, on a real Postgres, with more than one connection
 * open on it. That is why this workout needs a server rather than an in-process
 * database: a lock nobody else can wait on teaches nothing.
 *
 * Every attempt gets a schema of its own, made and dropped here, so the suites
 * can run at the same time without fighting over one table. You do not call any
 * of this. `migrate` is handed a connection; the checkpoints do the rest.
 */

/** What a statement came back with. `rowCount` is null for anything that changes no rows. */
export interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

/** The one connection `migrate` runs on. Everything it sends is logged. */
export interface Db {
  query<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<QueryResult<Row>>;
}

/** One statement the migration sent, as Postgres reported it back. */
export interface Statement {
  sql: string;
  /** `ALTER`, `UPDATE`, `SELECT`, `BEGIN`, `COMMIT`, `SET`, and so on. */
  command: string;
  /** Rows this statement changed, or null when it changed none. */
  rowCount: number | null;
}

/** What happened to one request that arrived while the migration was running. */
export type PageResult =
  { served: true; orders: number } | { served: false; sqlState: string; message: string };

/** A lock request nobody has been granted yet. */
export interface QueuedLock {
  mode: string;
  pid: number;
}

export interface Shop {
  /** The connection the migration runs on. */
  db: Db;
  /** Every statement the migration has sent, in order. */
  statements: Statement[];
  /** Read the table from somewhere that is not the migration. Not logged. */
  read<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row[]>;
  /**
   * Which relation `orders` is, and which file it lives in. Postgres hands a
   * table a new `relfilenode` when it writes every row of it out again.
   */
  identity(): Promise<{ oid: string; relfilenode: string }>;
  /**
   * The finance export: a second session that opens a transaction, reads one
   * order and stays there. It is closed for you when the test ends.
   */
  startExport(): Promise<void>;
  /**
   * One customer request, on a connection of its own, which gives up after
   * `timeoutMs` rather than waiting all day.
   */
  servePage(timeoutMs: number): Promise<PageResult>;
  /** Lock requests on `orders` that Postgres has not granted. */
  queuedLocks(): Promise<QueuedLock[]>;
  close(): Promise<void>;
}

/** Rows in the fixture. Enough to need more than one batch, few enough to stay quick. */
export const ORDER_COUNT = 2500;

/** Schemas left behind by a run that died before it could tidy up, in milliseconds. */
const STALE_AFTER_MS = 15 * 60 * 1000;

const PREFIX = 'hone_orders_';

/**
 * Where this workout was told to find a Postgres, which is the port the manifest
 * declared: the runner hands every declared port to the run in `requires` order,
 * and this workout declares one. Reading `PGPORT` here instead is how the check
 * and the connection came apart, with presence proved on 5432 while the suites
 * connected to 5433 and failed for a reason that looked like the exercise.
 *
 * The host is not a question. Presence is checked on loopback and only on
 * loopback, because reaching another machine would be the network.
 */
function requiredPort(): number {
  const [declared] = (process.env.HONE_REQUIRED_PORTS ?? '').split(',');
  const port = Number(declared);
  return Number.isInteger(port) && port > 0 ? port : 5432;
}

/**
 * The rest is who you connect as, which the requirement says nothing about, so
 * the environment still answers it. The defaults are a Homebrew install: your
 * own account, and the `postgres` database to make the schema from.
 */
function connection(): Record<string, unknown> {
  return {
    host: '127.0.0.1',
    port: requiredPort(),
    user: process.env.PGUSER ?? process.env.USER ?? 'postgres',
    database: process.env.PGDATABASE ?? 'postgres',
    ...(process.env.PGPASSWORD ? { password: process.env.PGPASSWORD } : {}),
    application_name: 'hone-orders-migration',
  };
}

function schemaName(): string {
  return `${PREFIX}${Date.now().toString(36)}_${randomBytes(4).toString('hex')}`;
}

/** Milliseconds encoded in a schema name, or null if it is not one of ours. */
function startedAt(name: string): number | null {
  const stamp = name.slice(PREFIX.length).split('_')[0];
  const ms = stamp ? Number.parseInt(stamp, 36) : Number.NaN;
  return Number.isFinite(ms) ? ms : null;
}

export async function createShop(): Promise<Shop> {
  const schema = schemaName();
  const statements: Statement[] = [];
  const opened: { client: Client; pid: number }[] = [];

  /**
   * Every connection lands in this attempt's own schema, so `orders` here is a
   * different relation from `orders` in the suite running beside it, with locks
   * of its own. An unhandled `error` event on a `pg` client takes the process
   * down with it, and this workout is about a connection cut off mid statement,
   * so every client gets a listener whether it needs one or not.
   */
  const open = async (): Promise<Client> => {
    const client = new Client(connection());
    client.on('error', () => {
      // Cut off on the way out, which is how this suite tidies up.
    });
    await client.connect();
    await client.query(`SET search_path = ${schema}`);
    const { rows } = await client.query<{ pid: number }>('SELECT pg_backend_pid() AS pid');
    opened.push({ client, pid: rows[0]?.pid ?? 0 });
    return client;
  };

  const control = new Client(connection());
  control.on('error', () => {});
  await control.connect();

  await sweepStaleSchemas(control);
  await control.query(`CREATE SCHEMA ${schema}`);
  await control.query(`SET search_path = ${schema}`);
  await control.query(`
    CREATE TABLE orders (
      id bigserial PRIMARY KEY,
      placed_at timestamptz NOT NULL,
      customer_email text NOT NULL,
      total_pence integer NOT NULL,
      status text NOT NULL
    )
  `);
  await control.query(
    `INSERT INTO orders (placed_at, customer_email, total_pence, status)
     SELECT now() - (g || ' minutes')::interval,
            'customer' || g || '@example.com',
            400 + g * 3,
            CASE WHEN g % 9 = 0 THEN 'refunded' ELSE 'paid' END
       FROM generate_series(1, ${ORDER_COUNT}) g`
  );

  const migration = await open();

  const db: Db = {
    async query<Row = Record<string, unknown>>(sql: string, params?: unknown[]) {
      const result = await migration.query(sql, params as never);
      // One string can carry several statements, and `pg` answers those with an
      // array. Each is logged on its own so the row counts stay honest.
      const parts = (Array.isArray(result) ? result : [result]) as {
        command?: string;
        rows?: Row[];
        rowCount: number | null;
      }[];
      for (const part of parts) {
        statements.push({ sql, command: part.command ?? '', rowCount: part.rowCount });
      }
      const last = parts[parts.length - 1];
      return { rows: last?.rows ?? [], rowCount: last?.rowCount ?? null };
    },
  };

  return {
    db,
    statements,

    async read<Row = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<Row[]> {
      const { rows } = await control.query(sql, params as never);
      return rows as Row[];
    },

    async identity() {
      const { rows } = await control.query<{ oid: string; relfilenode: string }>(
        `SELECT oid::text AS oid, relfilenode::text AS relfilenode
           FROM pg_class WHERE oid = 'orders'::regclass`
      );
      const row = rows[0];
      if (!row) throw new Error('orders is not there any more');
      return row;
    },

    async startExport() {
      const client = await open();
      await client.query('BEGIN');
      await client.query('SELECT id, total_pence FROM orders ORDER BY id LIMIT 1');
    },

    async servePage(timeoutMs: number): Promise<PageResult> {
      const client = await open();
      await client.query(`SET lock_timeout = ${timeoutMs}`);
      try {
        const { rows } = await client.query<{ orders: string }>(
          'SELECT count(*)::text AS orders FROM orders'
        );
        return { served: true, orders: Number(rows[0]?.orders ?? '0') };
      } catch (error) {
        const failure = error as { code?: string; message?: string };
        return {
          served: false,
          sqlState: failure.code ?? 'unknown',
          message: failure.message ?? String(error),
        };
      }
    },

    async queuedLocks() {
      const { rows } = await control.query<QueuedLock>(
        `SELECT mode, pid FROM pg_locks
          WHERE locktype = 'relation' AND relation = 'orders'::regclass AND NOT granted
          ORDER BY pid`
      );
      return rows;
    },

    async close() {
      // A connection blocked on a lock never notices the client going away, so
      // it is cut off from the server side first, and waited for: without this
      // the schema below cannot be dropped, because the blocked statement is
      // still queued for it.
      const pids = opened.map((entry) => entry.pid).filter((pid) => pid > 0);
      if (pids.length) {
        await control
          .query('SELECT pg_terminate_backend(pid, 5000) FROM unnest($1::int[]) AS pid', [pids])
          .catch(() => undefined);
      }
      await Promise.all(opened.map((entry) => entry.client.end().catch(() => undefined)));
      await control.query(`SET lock_timeout = '5s'`).catch(() => undefined);
      await control.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`).catch(() => undefined);
      await control.end().catch(() => undefined);
    },
  };
}

/**
 * A run killed part way through leaves its schema behind, and the name carries
 * when it was made, so the next run clears it out. Nothing here can touch a
 * schema a live suite is using: fifteen minutes is far longer than any of them
 * lives, and the lock timeout means a sweep never waits on one either.
 */
async function sweepStaleSchemas(control: Client): Promise<void> {
  try {
    await control.query(`SET lock_timeout = '1s'`);
    const { rows } = await control.query<{ nspname: string }>(
      'SELECT nspname FROM pg_namespace WHERE nspname LIKE $1',
      [`${PREFIX}%`]
    );
    const cutoff = Date.now() - STALE_AFTER_MS;
    for (const { nspname } of rows) {
      const made = startedAt(nspname);
      if (made === null || made > cutoff) continue;
      await control.query(`DROP SCHEMA IF EXISTS ${nspname} CASCADE`).catch(() => undefined);
    }
  } catch {
    // Tidying up is a courtesy. A run that cannot do it still runs.
  } finally {
    await control.query('SET lock_timeout = 0').catch(() => undefined);
  }
}
