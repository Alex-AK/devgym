# The orders list got slow

`GET /orders?status=pending` was fine when the table had a few hundred rows in it. There are 40,000
now and the page takes seconds. Support has started apologising for it.

The answer it gives is still the right one. It just takes seconds to give it.

## The task

Make it fast without changing what it answers: the same rows, in the same order, with the same total.

**`src/server/orders.ts`** — the endpoint.

**`src/server/schema.ts`** — the migration this feature shipped with, if you need it.

## How the checkpoints judge it

Not on a stopwatch, which would be flaky. On what the endpoint actually asks the database for:

- Every statement it runs is logged, along with how many rows came back.
- Checkpoint 4 runs `EXPLAIN` on the query you sent and reads the plan back. A query that looks right
  and a query Postgres runs well are two different things.

## Notes

The data is seeded and deterministic: 40,000 orders, 800 customers, and statuses that are lopsided
the way a real orders table is. About 240 orders are still `pending`.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Run `EXPLAIN ANALYZE` through `workspace.client` and compare the estimated row counts with the real
  ones. When they disagree badly, the planner is choosing on bad information.
- Deep pages stay expensive even once this is fixed: page 100 still walks the 2,000 rows in front of
  it. Work out what keyset pagination would look like here, and what it would cost you at the UI.
- An exact total costs a second pass over the same filter. Decide whether that is worth it, or
  whether the UI could live with "40,000+".
