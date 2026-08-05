# One column, two minutes of timeouts

`orders` has 4.1 million rows in production. Tuesday's release added one column to it, `public_ref`,
the UUID the new customer-facing order URLs are built from. The migration ran for two minutes and
forty seconds, and for all of it every request that touched `orders` timed out. The requests piling
up behind them took the rest of the API with them.

The column is right, and nobody wants it changed: every order has a reference of its own, no two the
same, and a new order gets one without anybody asking. It is going out again on Thursday.

## The task

Rewrite the migration in `src/server/migrate.ts` so it can run against the live table in the middle
of the afternoon.

Two things it has to hold to, because the checkpoints hold you to them:

- **No statement writes more than 1,000 rows**, and no transaction stays open across two of them.
- **Nothing waits more than a second for a lock.**

## How the checkpoints judge it

Not on a stopwatch, which would be flaky. On what the migration asked Postgres to do, and on what
happened to everybody else while it was asking:

- Every statement `migrate` sends is logged in `shop.statements`, with the command Postgres reported
  and the rows it changed.
- Checkpoint 2 reads `pg_class` before and after.
- Checkpoint 4 opens two more connections. One is the finance export: it starts a transaction, reads
  an order and stays there for the whole test. The other arrives after your migration has already
  asked for its lock, and asks for a page the way a customer would.

## Notes

- Postgres 17.10, over `pg`. `gen_random_uuid()` is built in; no extension.
- The suites connect on `127.0.0.1`, on the port this workout declares and the app checked before it
  let you start. A Postgres listening somewhere else is one edit to `requires` in `workout.json`, not
  a `PGPORT` in your shell.
- The fixture table has 2,500 orders rather than 4.1 million, so the suites stay quick. Nothing
  asserted here depends on the size: it only decides how many batches you need.
- `src/server/db.ts` sets all of this up, including a schema per test so the suites can run at the
  same time. You do not call any of it. `migrate` is handed one connection and everything it sends
  goes down that one.
- `npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Work out what would have to happen for the safe version to be unsafe too. A lock queue forms in
  front of a request that cannot be granted, so a statement that takes ACCESS EXCLUSIVE for a
  microsecond is still an outage if something else is holding the table when it asks.
- The migration gives up rather than waiting. Decide what should happen next: a retry loop with a
  ceiling, a deploy that fails and gets run again, or a different time of day.
- `ALTER TABLE ... ADD CONSTRAINT ... NOT VALID` leaves a constraint that new rows have to satisfy
  and old rows have not been checked against. Work out which of the constraints you use every day
  could be added that way, and which could not.
