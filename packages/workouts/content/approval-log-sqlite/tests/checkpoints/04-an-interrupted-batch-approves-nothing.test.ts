import { beforeEach, describe, expect, it } from 'vitest';

import { approveMany, NotPending } from '../../src/server/approvals';
import { createDb, type Db } from '../../src/server/db';

let db: Db;

beforeEach(() => {
  db = createDb();
});

const logCount = () => db.prepare('SELECT count(*) AS c FROM approval_log').get<{ c: number }>()?.c;
const stillPending = () =>
  db
    .prepare("SELECT count(*) AS c FROM expenses WHERE id IN (1, 2, 3) AND status = 'pending'")
    .get<{ c: number }>()?.c;

describe('the month-end batch', () => {
  it('approves every expense in it and logs every one', async () => {
    await approveMany(db, { expenseIds: [1, 2, 3], actor: 'ana', note: 'month end' });

    expect(stillPending()).toBe(0);
    expect(logCount()).toBe(3);
  });

  it('approves none of them when it is interrupted at the third', async () => {
    // Two log rows go in, the third write fails.
    db.failNextWrite('approval_log', 2);

    await expect(
      approveMany(db, { expenseIds: [1, 2, 3], actor: 'ana', note: 'month end' })
    ).rejects.toThrow();

    expect(stillPending(), 'the run stopped at the third and left the first two approved').toBe(3);
  });

  it('logs none of them when it is interrupted at the third', async () => {
    db.failNextWrite('approval_log', 2);

    await expect(
      approveMany(db, { expenseIds: [1, 2, 3], actor: 'ana', note: 'month end' })
    ).rejects.toThrow();

    expect(logCount()).toBe(0);
  });

  it('approves none of them when one of them is not pending', async () => {
    await expect(
      approveMany(db, { expenseIds: [1, 5, 2], actor: 'ana', note: 'month end' })
    ).rejects.toThrow(NotPending);

    expect(stillPending()).toBe(3);
    expect(logCount()).toBe(0);
  });
});
