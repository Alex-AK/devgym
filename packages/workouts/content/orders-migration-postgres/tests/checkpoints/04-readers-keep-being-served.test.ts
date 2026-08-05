import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createShop, type PageResult, type QueuedLock, type Shop } from '../../src/server/db';
import { migrate } from '../../src/server/migrate';

/**
 * Three connections, which is why this workout needs a real server: the finance
 * export holds a read transaction open, the migration runs into it, and then a
 * customer asks for a page. What is asserted is who was served and who was
 * refused, never how long anything took.
 */

/** How long a customer's page waits for a lock before it gives up. */
const PAGE_TIMEOUT_MS = 3000;

/** Room for a message already on the wire. It measures nothing. */
const SETTLE_MS = 2000;

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

let shop: Shop;

beforeEach(async () => {
  shop = await createShop();
});

afterEach(async () => {
  await shop.close();
});

interface Attempt {
  page: PageResult;
  stillQueued: QueuedLock[];
  outcome: Promise<unknown>;
}

async function migrateIntoTheExport(): Promise<Attempt> {
  await shop.startExport();

  let settled = false;
  const outcome = migrate(shop.db).then(
    () => {
      settled = true;
      return null;
    },
    (error: unknown) => {
      settled = true;
      return error;
    }
  );

  // Wait for a fact, not for a duration: either the migration has asked Postgres
  // for a lock on orders, or it has stopped asking. Without this the page below
  // could reach the lock manager first and be served for the wrong reason.
  const deadline = Date.now() + 5000;
  while (!settled && (await shop.queuedLocks()).length === 0) {
    if (Date.now() > deadline) {
      throw new Error(
        'the migration neither asked for a lock on orders nor finished, in 5 seconds'
      );
    }
    await sleep(10);
  }

  const page = await shop.servePage(PAGE_TIMEOUT_MS);
  const stillQueued = await shop.queuedLocks();

  return { page, stillQueued, outcome };
}

describe('a page asked for while the migration is running', () => {
  it('is answered, and the migration says why it stopped', async () => {
    const { page, stillQueued, outcome } = await migrateIntoTheExport();

    expect(
      page.served,
      page.served
        ? ''
        : `a plain SELECT was refused (${page.sqlState}) while the migration was waiting: ${page.message}`
    ).toBe(true);

    expect(
      stillQueued,
      'the migration is still queued for a lock on orders, and every read that arrives now is queued behind it'
    ).toEqual([]);

    const failure = await Promise.race([outcome, sleep(SETTLE_MS).then(() => 'still running')]);

    expect(failure, 'the migration is still going, so it never gave up on the lock').not.toBe(
      'still running'
    );
    expect(
      failure,
      'the migration reported success, but the table was held against it the whole time'
    ).not.toBeNull();
    expect(
      (failure as { code?: string }).code,
      'the migration stopped, but not on a lock timeout, and 55P03 is what lock_timeout gives you'
    ).toBe('55P03');
  });
});
