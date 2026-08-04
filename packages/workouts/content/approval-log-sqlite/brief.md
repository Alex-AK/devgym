# The log says it was approved

Finance runs the quarterly compliance export off `approval_log`, and this quarter it does not match
the expenses it describes. July's export lists 41 approvals. The `expenses` table has 39 rows
approved that month, and only 38 of those appear in the log at all.

Three complaints came back with the export:

- Three of the 41 name expenses that are still marked rejected. Nobody approved those.
- Every row says the expense went from approved to approved, so the column meant to show what
  changed shows nothing.
- One expense is approved, with a name against it, and has no row in the log. The month-end batch
  that morning stopped part way with a connection error, and every expense it had already reached
  stayed approved.

## The task

`src/server/approvals.ts` and `src/server/audit.ts` are yours. `src/server/db.ts` builds the
database and is not editable.

What has to be true when you are done:

- An expense is approved only while it is pending. Anything else throws `NotPending` and changes
  nothing, and an id that is no expense throws `NotFound`.
- An approval leaves exactly one log row, and its `from_status` is the status the expense actually
  had.
- A call that fails part way leaves neither the change nor the log row.
- The batch is one decision, not several. A month-end run that stops at the third expense has not
  approved the first two.
- `approveExpense` and `approveMany` keep the signatures they have, and the checkpoints call both
  with `await`. Everything else across those two files is yours to move.
- No new dependency.

## Notes

`db.ts` builds an in-memory database with these two tables and five expenses in it: 1, 2 and 3
pending, 4 already approved by ana, 5 rejected.

```sql
CREATE TABLE expenses (
  id INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by TEXT
);

CREATE TABLE approval_log (
  id INTEGER PRIMARY KEY,
  expense_id INTEGER NOT NULL,
  actor TEXT NOT NULL,
  from_status TEXT NOT NULL,
  to_status TEXT NOT NULL,
  note TEXT NOT NULL,
  logged_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- `db.prepare(sql)` is better-sqlite3, so every call on it is synchronous. `.run(...)` answers with
  `{ changes, lastInsertRowid }`, `.get(...)` with a row or `undefined`, `.all(...)` with an array.
- `db.transaction(fn)` returns a function that runs `fn` between BEGIN and COMMIT and undoes all of
  it if `fn` throws. `db.inTransaction` says whether one is open.
- `db.failNextWrite(fragment, skip?)` is test-only, and it is how the checkpoints stop a call part
  way through: the next prepared statement whose SQL contains `fragment` throws instead of running,
  and `skip` lets that many matching statements past first. You do not need to call it.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Rejection is the other half of this and the same shape. Write it, then decide whether approving
  one expense and rejecting another in the same run is one decision or two.
- `approveMany` refuses the whole batch over a single expense somebody else already decided. Work
  out what the caller should be told instead when the batch is a hundred rows: refused outright, or
  finished with a list of what it skipped. Only one of those makes an export that adds up.
- A transaction covers this database and nothing else. If an approval also had to email the person
  who claimed it, work out where that call goes and what a rollback does to an email already sent.
