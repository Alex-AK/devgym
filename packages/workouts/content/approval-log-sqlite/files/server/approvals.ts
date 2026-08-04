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
 * Approve one expense, and write the log row the compliance export reads.
 */
export async function approveExpense(
  db: Db,
  decision: Decision
): Promise<{ id: number; status: string }> {
  const { actor, expenseId, note } = decision;

  const expense = db
    .prepare('SELECT id, status FROM expenses WHERE id = ?')
    .get<ExpenseRow>(expenseId);
  if (!expense) throw new NotFound(`no expense ${expenseId}`);

  db.prepare(
    `UPDATE expenses SET status = 'approved', approved_by = ?
     WHERE id = ? AND status = 'pending'`
  ).run(actor, expenseId);

  const current = db
    .prepare('SELECT id, status FROM expenses WHERE id = ?')
    .get<ExpenseRow>(expenseId);

  await recordDecision(db, {
    expenseId,
    actor,
    fromStatus: current?.status ?? 'unknown',
    toStatus: 'approved',
    note,
  });

  return { id: expenseId, status: 'approved' };
}

/**
 * Approve a batch of expenses. Finance runs this at month end against
 * everything that is still waiting.
 */
export async function approveMany(db: Db, batch: Batch): Promise<number[]> {
  const approved: number[] = [];

  for (const expenseId of batch.expenseIds) {
    await approveExpense(db, { expenseId, actor: batch.actor, note: batch.note });
    approved.push(expenseId);
  }

  return approved;
}
