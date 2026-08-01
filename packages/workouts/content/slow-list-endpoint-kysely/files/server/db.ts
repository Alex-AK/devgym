import { PGlite } from '@electric-sql/pglite';
import { Kysely } from 'kysely';

import { type LoggedQuery, pgliteDialect } from './dialect';
import { INDEXES_SQL, TABLES_SQL } from './schema';
import type { Database } from './types';

/** 40,000 orders across 800 customers. Small for production, big enough to hurt. */
const ORDER_COUNT = 40_000;
const CUSTOMER_COUNT = 800;

export type { LoggedQuery };

export interface Workspace {
  db: Kysely<Database>;
  /** Every statement Kysely has run, in order. The checkpoints read this. */
  queries: LoggedQuery[];
  /** Straight to Postgres, for EXPLAIN. */
  client: PGlite;
  close: () => Promise<void>;
}

/**
 * A fresh in-process Postgres, seeded identically every time. Statuses are
 * deliberately lopsided, the way they are in a real orders table: most things
 * shipped long ago and only a few are still pending.
 */
export async function createWorkspace(): Promise<Workspace> {
  const client = new PGlite();
  await client.waitReady;

  await client.exec(TABLES_SQL);
  await client.exec(`
    INSERT INTO customers (name, email)
    SELECT 'Customer ' || g, 'customer' || g || '@example.com'
    FROM generate_series(1, ${CUSTOMER_COUNT}) g;

    INSERT INTO orders (customer_id, status, total_cents, created_at)
    SELECT
      1 + (g % ${CUSTOMER_COUNT}),
      CASE
        WHEN g % 167 = 0 THEN 'pending'
        WHEN g % 11 = 0 THEN 'cancelled'
        WHEN g % 3 = 0 THEN 'paid'
        ELSE 'shipped'
      END,
      1000 + (g * 37) % 90000,
      TIMESTAMPTZ '2023-01-01 00:00:00+00' + (g * INTERVAL '11 minutes')
    FROM generate_series(1, ${ORDER_COUNT}) g;
  `);
  await client.exec(INDEXES_SQL);
  // Without stats the planner is guessing, and its guess is a sequential scan.
  await client.exec('ANALYZE;');

  const queries: LoggedQuery[] = [];
  const db = new Kysely<Database>({
    dialect: pgliteDialect(client, (query) => queries.push(query)),
  });

  return { db, queries, client, close: () => db.destroy() };
}
