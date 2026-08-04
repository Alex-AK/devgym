import type { Db } from './db';

export interface LogEntry {
  expenseId: number;
  actor: string;
  fromStatus: string;
  toStatus: string;
  note: string;
}

/**
 * The approval log. This was a service of its own behind an HTTP client until
 * last year, which is where the shape of this function comes from. It is a
 * table in the same database now.
 */
export async function recordDecision(db: Db, entry: LogEntry): Promise<void> {
  db.prepare(
    `INSERT INTO approval_log (expense_id, actor, from_status, to_status, note)
     VALUES (?, ?, ?, ?, ?)`
  ).run(entry.expenseId, entry.actor, entry.fromStatus, entry.toStatus, entry.note);
}
