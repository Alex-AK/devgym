import type { Db } from './db';

/**
 * Adds `public_ref` to `orders` without holding the table shut while it works.
 *
 * The statement this replaces is one line and looks like the modern fast path:
 * `ADD COLUMN ... NOT NULL DEFAULT` stopped rewriting the table in Postgres 11,
 * so the version everybody remembers being slow is long gone. The catch is that
 * the exemption only covers a default Postgres can work out once and remember.
 * `gen_random_uuid()` is volatile and has to be evaluated per row, so 17 rewrites
 * every row into a new file and holds ACCESS EXCLUSIVE for the whole copy. That
 * lock conflicts with everything, including a plain SELECT, and worse: while it
 * is queued behind somebody else's open transaction, every reader that arrives
 * queues behind it.
 *
 * So: take the exclusive lock four times for microseconds each, and do the work
 * in between under a lock that blocks nobody.
 */

/** Rows per batch. The brief caps it; anything under the cap is a judgement call. */
const BATCH = 1000;

export async function migrate(db: Db): Promise<void> {
  // The seatbelt, and it belongs first because it covers everything after it. A
  // statement that cannot have its lock now is refused (SQLSTATE 55P03) instead
  // of sitting in the queue with the whole application piling up behind it. A
  // migration that gives up can be run again in a minute; one that waits cannot
  // be un-run.
  await db.query(`SET lock_timeout = '250ms'`);

  // Nullable and with no default: catalog only, no rows read, no rows written.
  await db.query('ALTER TABLE orders ADD COLUMN public_ref uuid');

  // Also catalog only. New orders get a reference from here on, which means the
  // backfill below only ever has the rows that were already there to deal with.
  await db.query('ALTER TABLE orders ALTER COLUMN public_ref SET DEFAULT gen_random_uuid()');

  // The rows, a batch at a time, each batch its own transaction. One UPDATE over
  // the whole table would hold row locks on all of it and leave a dead version
  // of every row behind at once.
  for (;;) {
    const { rowCount } = await db.query(
      `UPDATE orders SET public_ref = gen_random_uuid()
        WHERE id IN (SELECT id FROM orders WHERE public_ref IS NULL ORDER BY id LIMIT ${BATCH})`
    );
    if (!rowCount) break;
  }

  // `SET NOT NULL` on its own reads every row to check, under ACCESS EXCLUSIVE.
  // A CHECK constraint added NOT VALID costs nothing, and validating it takes
  // SHARE UPDATE EXCLUSIVE, which blocks neither readers nor writers. With a
  // valid one in place, `SET NOT NULL` trusts it and skips the scan: measured on
  // 17.10 over 200,000 rows, 31ms of exclusive lock becomes 0.2ms.
  await db.query(
    `ALTER TABLE orders
       ADD CONSTRAINT orders_public_ref_present CHECK (public_ref IS NOT NULL) NOT VALID`
  );
  await db.query('ALTER TABLE orders VALIDATE CONSTRAINT orders_public_ref_present');
  await db.query('ALTER TABLE orders ALTER COLUMN public_ref SET NOT NULL');

  // The column's own NOT NULL says the same thing, so the constraint is scaffolding now.
  await db.query('ALTER TABLE orders DROP CONSTRAINT orders_public_ref_present');
}
