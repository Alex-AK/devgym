import { beforeEach, describe, expect, it } from 'vitest';

import { approveExpense } from '../../src/server/approvals';
import { createDb, type Db } from '../../src/server/db';

let db: Db;

beforeEach(() => {
  db = createDb();
});

const logRows = () =>
  db
    .prepare('SELECT expense_id, actor, from_status, to_status, note FROM approval_log ORDER BY id')
    .all();

describe('an approval', () => {
  it('marks the expense approved and records who did it', async () => {
    await approveExpense(db, { expenseId: 1, actor: 'ana', note: 'travel to the summit' });

    expect(db.prepare('SELECT status, approved_by FROM expenses WHERE id = 1').get()).toEqual({
      status: 'approved',
      approved_by: 'ana',
    });
  });

  it('writes one log row, for that expense', async () => {
    await approveExpense(db, { expenseId: 1, actor: 'ana', note: 'travel to the summit' });

    expect(logRows()).toHaveLength(1);
    expect(logRows()[0]).toMatchObject({
      expense_id: 1,
      actor: 'ana',
      note: 'travel to the summit',
    });
  });

  it('logs the status it changed from, not the one it changed to', async () => {
    await approveExpense(db, { expenseId: 1, actor: 'ana', note: 'travel to the summit' });

    expect(
      logRows()[0],
      'the log row is meant to describe a transition, and this one names the same status twice'
    ).toMatchObject({ from_status: 'pending', to_status: 'approved' });
  });
});
