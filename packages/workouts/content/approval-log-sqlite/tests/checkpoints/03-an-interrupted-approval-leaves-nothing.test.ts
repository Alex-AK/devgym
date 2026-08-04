import { beforeEach, describe, expect, it } from 'vitest';

import { approveExpense } from '../../src/server/approvals';
import { createDb, type Db } from '../../src/server/db';

let db: Db;

beforeEach(() => {
  db = createDb();
});

const logCount = () => db.prepare('SELECT count(*) AS c FROM approval_log').get<{ c: number }>()?.c;
const expense = (id: number) =>
  db.prepare('SELECT status, approved_by FROM expenses WHERE id = ?').get(id);

/** Approve expense 2 with the write to `approval_log` set to fail. */
async function interrupted() {
  db.failNextWrite('approval_log');
  await expect(
    approveExpense(db, { expenseId: 2, actor: 'ana', note: 'conference ticket' })
  ).rejects.toThrow();
}

describe('an approval interrupted between its two writes', () => {
  it('leaves the expense as it found it', async () => {
    await interrupted();

    expect(expense(2), 'the expense is approved and the log has no idea it happened').toEqual({
      status: 'pending',
      approved_by: null,
    });
  });

  it('leaves no log row behind either', async () => {
    await interrupted();

    expect(logCount()).toBe(0);
  });

  it('leaves the connection ready for the next attempt', async () => {
    await interrupted();

    await approveExpense(db, { expenseId: 2, actor: 'ana', note: 'conference ticket' });

    expect(expense(2)).toEqual({ status: 'approved', approved_by: 'ana' });
    expect(logCount()).toBe(1);
    expect(db.inTransaction, 'a transaction was left open').toBe(false);
  });
});
