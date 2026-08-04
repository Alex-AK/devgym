import { recordDecision } from './audit';
import type { Db } from './db';

export interface Decision {
  expenseId: number;
  actor: string;
  note: string;
}

export interface Batch {
  expenseIds: number[];
  actor: string;
  note: string;
}

/** No expense with that id. */
export class NotFound extends Error {}

/** The expense has already been decided, so there is nothing to approve. */
export class NotPending extends Error {}

interface ExpenseRow {
  id: number;
  status: string;
}

/**
 * The state change and the log row describing it, in that order and nowhere
 * near a promise. Every caller runs this inside a transaction, so the two
 * either both land or neither does.
 */
function approve(db: Db, decision: Decision): void {
  const { actor, expenseId, note } = decision;

  const expense = db
    .prepare('SELECT id, status FROM expenses WHERE id = ?')
    .get<ExpenseRow>(expenseId);
  if (!expense) throw new NotFound(`no expense ${expenseId}`);
  if (expense.status !== 'pending') {
    throw new NotPending(`expense ${expenseId} is already ${expense.status}`);
  }

  const { changes } = db
    .prepare(
      `UPDATE expenses SET status = 'approved', approved_by = ?
       WHERE id = ? AND status = 'pending'`
    )
    .run(actor, expenseId);
  if (changes !== 1) throw new NotPending(`expense ${expenseId} is no longer pending`);

  // The status read before the update, not after it: the log row describes a
  // transition, and by now the row on disk is the destination.
  recordDecision(db, {
    expenseId,
    actor,
    fromStatus: expense.status,
    toStatus: 'approved',
    note,
  });
}

export async function approveExpense(
  db: Db,
  decision: Decision
): Promise<{ id: number; status: string }> {
  return db.transaction(() => {
    approve(db, decision);
    return { id: decision.expenseId, status: 'approved' };
  })();
}

/**
 * The batch is one unit of work, not one per expense. A run that stops at the
 * third has to leave the first two alone as well, or the export ends up
 * describing a month end that never finished.
 */
export async function approveMany(db: Db, batch: Batch): Promise<number[]> {
  return db.transaction(() => {
    for (const expenseId of batch.expenseIds) {
      approve(db, { expenseId, actor: batch.actor, note: batch.note });
    }
    return [...batch.expenseIds];
  })();
}
