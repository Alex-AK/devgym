import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createShop, ORDER_COUNT, type Shop, type Statement } from '../../src/server/db';
import { migrate } from '../../src/server/migrate';

/**
 * Read off the statement log rather than off a clock: every statement the
 * migration sent, and how many rows Postgres said it changed.
 */

const BATCH_CAP = 1000;
const WRITES = new Set(['INSERT', 'UPDATE', 'DELETE']);

let shop: Shop;

beforeEach(async () => {
  shop = await createShop();
});

afterEach(async () => {
  await shop.close();
});

const writes = (statements: Statement[]): Statement[] =>
  statements.filter((statement) => WRITES.has(statement.command));

/** The most writes any one transaction had open at a time. */
function widestTransaction(statements: Statement[]): number {
  let depth = 0;
  let inFlight = 0;
  let widest = 0;

  for (const statement of statements) {
    if (statement.command === 'BEGIN') {
      depth += 1;
      inFlight = 0;
    } else if (statement.command === 'COMMIT' || statement.command === 'ROLLBACK') {
      depth = Math.max(0, depth - 1);
      widest = Math.max(widest, inFlight);
      inFlight = 0;
    } else if (depth > 0 && WRITES.has(statement.command)) {
      inFlight += 1;
    }
  }

  return Math.max(widest, inFlight);
}

describe('how the rows get filled in', () => {
  it('fills them in more than one go', async () => {
    await migrate(shop.db);

    expect(
      writes(shop.statements).length,
      'the rows were never written a batch at a time, so one statement was left to reach all of them'
    ).toBeGreaterThan(1);
  });

  it('never changes more than a batch of rows in one statement', async () => {
    await migrate(shop.db);

    const biggest = writes(shop.statements).reduce(
      (most, statement) => Math.max(most, statement.rowCount ?? 0),
      0
    );

    expect(biggest, `one statement changed ${String(biggest)} rows in a single pass`).toBeLessThan(
      BATCH_CAP + 1
    );
  });

  it('reaches every order between them', async () => {
    await migrate(shop.db);

    const changed = writes(shop.statements).reduce(
      (total, statement) => total + (statement.rowCount ?? 0),
      0
    );

    expect(changed, 'the batches together did not account for every order').toBeGreaterThan(
      ORDER_COUNT - 1
    );
  });

  it('does not hold one transaction open across two of them', async () => {
    await migrate(shop.db);

    expect(
      widestTransaction(shop.statements),
      'a transaction stayed open over more than one batch, which is the single long ' +
        'transaction the batching was meant to avoid'
    ).toBeLessThan(2);
  });
});
