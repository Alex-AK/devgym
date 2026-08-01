import { integer, pgTable, serial, text } from 'drizzle-orm/pg-core';

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  sku: text('sku').notNull(),
  priceCents: integer('price_cents').notNull(),
});

export type Product = typeof products.$inferSelect;

export const TABLES_SQL = `
  CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT NOT NULL,
    price_cents INTEGER NOT NULL
  );
`;
