import { beforeEach, describe, expect, it } from 'vitest';

import { approveExpense, NotFound, NotPending } from '../../src/server/approvals';
import { createDb, type Db } from '../../src/server/db';

let db: Db;

beforeEach(() => {
  db = createDb();
});

const logCount = () => db.prepare('SELECT count(*) AS c FROM approval_log').get<{ c: number }>()?.c;
const expense = (id: number) =>
  db.prepare('SELECT status, approved_by FROM expenses WHERE id = ?').get(id);

describe('an expense that is not waiting on a decision', () => {
  it('is refused when it has already been approved', async () => {
    await expect(
      approveExpense(db, { expenseId: 4, actor: 'sam', note: 'month end' })
    ).rejects.toThrow(NotPending);

    expect(expense(4), 'the earlier approval was overwritten').toEqual({
      status: 'approved',
      approved_by: 'ana',
    });
    expect(logCount(), 'the log gained a row for an approval that did not happen').toBe(0);
  });

  it('is refused when it was rejected', async () => {
    await expect(
      approveExpense(db, { expenseId: 5, actor: 'sam', note: 'month end' })
    ).rejects.toThrow(NotPending);

    expect(expense(5)).toEqual({ status: 'rejected', approved_by: null });
    expect(
      logCount(),
      'this is the export listing approvals for expenses that are still rejected'
    ).toBe(0);
  });

  it('is refused when there is no such expense', async () => {
    await expect(
      approveExpense(db, { expenseId: 99, actor: 'sam', note: 'month end' })
    ).rejects.toThrow(NotFound);

    expect(logCount()).toBe(0);
  });
});
