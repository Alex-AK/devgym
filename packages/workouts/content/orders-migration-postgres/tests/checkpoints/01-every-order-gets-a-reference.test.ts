import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createShop, ORDER_COUNT, type Shop } from '../../src/server/db';
import { migrate } from '../../src/server/migrate';

/**
 * Nothing about the column itself changes, whatever route the migration takes to
 * get there. The other three checkpoints are about how it arrives; this one is
 * about what has to be true once it has.
 */

let shop: Shop;

beforeEach(async () => {
  shop = await createShop();
});

afterEach(async () => {
  await shop.close();
});

describe('the column the migration leaves behind', () => {
  it('gives every order that was already there a reference of its own', async () => {
    await migrate(shop.db);

    const [counts] = await shop.read<{ total: string; filled: string; distinct_refs: string }>(
      `SELECT count(*)::text AS total,
              count(public_ref)::text AS filled,
              count(DISTINCT public_ref)::text AS distinct_refs
         FROM orders`
    );

    expect(counts?.total, 'orders went missing').toBe(String(ORDER_COUNT));
    expect(counts?.filled, 'some orders came out with no reference').toBe(String(ORDER_COUNT));
    expect(counts?.distinct_refs, 'two orders share a reference').toBe(String(ORDER_COUNT));
  });

  it('gives a new order one without being asked', async () => {
    await migrate(shop.db);

    const [inserted] = await shop.read<{ public_ref: string | null }>(
      `INSERT INTO orders (placed_at, customer_email, total_pence, status)
       VALUES (now(), 'new@example.com', 1200, 'paid')
       RETURNING public_ref::text AS public_ref`
    );

    expect(inserted?.public_ref, 'an insert that says nothing about public_ref got null').toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    );
  });

  it('refuses an order that arrives with no reference', async () => {
    await migrate(shop.db);

    const sqlState = await shop
      .read(
        `INSERT INTO orders (placed_at, customer_email, total_pence, status, public_ref)
         VALUES (now(), 'null@example.com', 1200, 'paid', NULL)`
      )
      .then(
        () => 'accepted',
        (error: { code?: string }) => error.code ?? 'unknown'
      );

    // 23502 is not_null_violation. Anything else means the column takes nulls.
    expect(sqlState, 'the column accepted a null, so it is not NOT NULL').toBe('23502');
  });
});
