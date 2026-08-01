/**
 * The migration for this feature. Tables first, then indexes, the way they would
 * have been added over time.
 */
export const TABLES_SQL = `
  CREATE TABLE customers (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER NOT NULL REFERENCES customers(id),
    status TEXT NOT NULL,
    total_cents INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL
  );
`;

/**
 * Every index on these tables.
 *
 * The orders list filters on status and orders by created_at descending, so it
 * gets one index covering both, in that order. Status first because it is the
 * equality; created_at second so the rows come out of the index already sorted
 * and the plan needs no sort step at all.
 */
export const INDEXES_SQL = `
  CREATE INDEX customers_email_idx ON customers (email);
  CREATE INDEX orders_status_created_at_idx ON orders (status, created_at DESC);
`;
