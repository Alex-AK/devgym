import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createShop, type Shop } from '../../src/server/db';
import { migrate } from '../../src/server/migrate';

/**
 * Not timed, because a timed assertion is flaky and a fixture of 2,500 rows is
 * fast whatever you do to it. What is asserted is the thing the clock was only
 * ever a proxy for: whether Postgres copied the table.
 *
 * `relfilenode` is the file a relation's rows live in. Postgres changes it when
 * it writes the whole relation out again, and holds ACCESS EXCLUSIVE for as long
 * as that takes. Same number afterwards, same file, nothing copied.
 */

let shop: Shop;

beforeEach(async () => {
  shop = await createShop();
});

afterEach(async () => {
  await shop.close();
});

interface IndexFile {
  relname: string;
  relfilenode: string;
}

const indexFiles = (shop: Shop): Promise<IndexFile[]> =>
  shop.read<IndexFile>(
    `SELECT c.relname, c.relfilenode::text AS relfilenode
       FROM pg_index i
       JOIN pg_class c ON c.oid = i.indexrelid
      WHERE i.indrelid = 'orders'::regclass
      ORDER BY c.relname`
  );

describe('what the migration leaves on disk', () => {
  it('leaves orders in the file it was already in', async () => {
    const before = await shop.identity();

    await migrate(shop.db);

    const after = await shop.identity();

    expect(after.oid, 'orders is a different relation than the one that was there').toBe(
      before.oid
    );
    expect(
      after.relfilenode,
      'orders was written out again from scratch: every row copied into a new file, ' +
        'with ACCESS EXCLUSIVE held on the table for the whole copy'
    ).toBe(before.relfilenode);
  });

  it('leaves the indexes on orders alone as well', async () => {
    const before = await indexFiles(shop);
    expect(before.length, 'the fixture should have a primary key index').toBeGreaterThan(0);

    await migrate(shop.db);

    expect(
      await indexFiles(shop),
      'the indexes were rebuilt, which is what a table rewrite does to them'
    ).toEqual(before);
  });
});
