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
 * Every index on these tables. The primary keys come for free; nobody has added
 * anything since.
 *
 * TODO: whatever the orders list actually needs.
 */
export const INDEXES_SQL = `
  CREATE INDEX customers_email_idx ON customers (email);
`;
