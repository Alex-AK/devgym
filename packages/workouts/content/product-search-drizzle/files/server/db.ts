import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';

import { products, TABLES_SQL } from './schema';

/**
 * The catalogue. Hand-written rows first, because the awkward ones are the
 * point: names that share a prefix, names that only differ by case, a term that
 * lives in the SKU and not the name, and two names carrying characters that
 * mean something to LIKE.
 */
const CATALOGUE = `
  INSERT INTO products (name, sku, price_cents) VALUES
    ('Blue Widget', 'WDG-BLU', 3000),
    ('WIDGET pro', 'WDG-PRO', 5000),
    ('widget mini', 'WDG-MIN', 1200),
    ('Widget 501', 'WDG-501', 2500),
    ('Bracket, heavy', 'WDG-BRK', 800),
    ('50% Cotton Tee', 'TEE-050', 1900),
    ('Cotton Tee, plain', 'TEE-PLN', 1500),
    ('Cable_A', 'CAB-A01', 900),
    ('CableXA', 'CAB-X01', 950),
    ('Cable tidy', 'CAB-TDY', 400),
    ('Desk lamp', 'LMP-DSK', 4200),
    ('Floor lamp', 'LMP-FLR', 7800),
    ('Monitor arm', 'ARM-MON', 6400),
    ('Laptop stand', 'STD-LAP', 3300),
    ('Keyboard tray', 'TRY-KBD', 2100),
    ('Footrest', 'RST-FOT', 2800),
    ('Chair mat', 'MAT-CHR', 3900),
    ('Standing desk', 'DSK-STD', 44000),
    ('Cork board', 'BRD-CRK', 1700),
    ('Whiteboard marker', 'MKR-WHT', 300);

  -- Twelve rows that share a name, so an ordering with no tie-break has
  -- nothing to fall back on and pages start repeating rows.
  INSERT INTO products (name, sku, price_cents)
  SELECT 'Refill pack', 'RFL-' || lpad(g::text, 3, '0'), 500 + g * 10
  FROM generate_series(1, 12) g;

  -- Filler, so paging has somewhere to go.
  INSERT INTO products (name, sku, price_cents)
  SELECT 'Storage box ' || lpad(g::text, 2, '0'), 'BOX-' || lpad(g::text, 3, '0'), 1000 + g * 25
  FROM generate_series(1, 28) g;
`;

export interface LoggedQuery {
  sql: string;
  parameters: unknown[];
}

export interface Workspace {
  db: ReturnType<typeof drizzle<{ products: typeof products }>>;
  /** Every statement drizzle has run. The last checkpoint reads this. */
  queries: LoggedQuery[];
  client: PGlite;
  close: () => Promise<void>;
}

export async function createWorkspace(): Promise<Workspace> {
  const client = new PGlite();
  await client.waitReady;

  await client.exec(TABLES_SQL);
  await client.exec(CATALOGUE);

  const queries: LoggedQuery[] = [];
  const db = drizzle(client, {
    schema: { products },
    logger: {
      logQuery(sql: string, parameters: unknown[]) {
        queries.push({ sql, parameters });
      },
    },
  });

  return { db, queries, client, close: () => client.close() };
}
