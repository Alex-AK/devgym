import type { Db } from './db';

/**
 * Adds `public_ref` to `orders`: a UUID of its own on every order already there,
 * and one on every order written from here on.
 *
 * This is what went out on Tuesday.
 */
export async function migrate(db: Db): Promise<void> {
  await db.query(`
    ALTER TABLE orders
      ADD COLUMN public_ref uuid NOT NULL DEFAULT gen_random_uuid()
  `);
}
