# The orders list got slow

`GET /orders?status=pending` was fine when the table had a few hundred rows in it. There are 40,000
now and the page takes seconds. Support has started apologising for it.

Nothing about the endpoint is wrong, exactly. It returns the right orders in the right order. It is
just doing all of the work in the wrong place.

## The task

Make it fast without changing what it answers.

**`src/server/orders.ts`** — the endpoint. Read it before you change it; there is more than one thing
going on.

**`src/server/schema.ts`** — the migration. Indexes go in `INDEXES_SQL`, and there is a reason the
only one there is on a different table.

## How the checkpoints judge it

Not on a stopwatch, which would be flaky. On what the endpoint actually asks the database for:

- Every statement it runs is logged, along with how many rows came back. A query that drags 40,000
  rows across to throw 39,980 of them away is visible.
- Checkpoint 4 runs `EXPLAIN` on the query you sent and reads the plan. `Seq Scan on orders` means
  Postgres read the whole table. A `Sort` step means it had to order the rows itself, which the
  right index would have done for it.

Note the second one: an index that exists but that the planner refuses to use has bought you nothing,
and this is how you find that out.

## Notes

The data is seeded and deterministic: 40,000 orders, 800 customers, and statuses that are lopsided
the way a real orders table is. Only about 240 orders are still `pending`, which is exactly why an
index on `status` is worth having.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Run `EXPLAIN ANALYZE` through `workspace.client` and compare the estimated row counts with the real
  ones. When they disagree badly, the planner is choosing on bad information.
- `OFFSET 2000` still walks and discards 2,000 rows. Work out what keyset pagination would look like
  here, and what it would cost you at the UI.
- The count query repeats the filter. Decide whether an exact total is worth a second scan, or
  whether the UI could live with "40,000+".
