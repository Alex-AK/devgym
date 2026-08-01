# The orders report melts under real data

The orders report was written against a test database with a dozen orders in it. It went out to a
customer with four thousand and took most of a minute. Nobody has touched it since it was written.

## The task

Fix `buildOrdersReport` in `src/server/report.ts`.

It keeps the shape and the figures it has now: one row per order, with the customer's name, how many
lines are on it and what it comes to. Fast and wrong is not an improvement.

## How the checkpoints judge it

Not on a stopwatch. On what the report asks the database for. Every statement is logged with the
number of rows that came back with it, and the report is run against a small database and a larger
one.

## Notes

The entities are `EntitySchema` definitions rather than decorated classes, so the columns are named
exactly like the properties.

`workspace.orders`, `workspace.items` and `workspace.customers` are TypeORM repositories, so
`createQueryBuilder` is there if you want it.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- The report has no pagination. Add `take` and `skip`, and find out why `getRawMany` and `getMany`
  can disagree about what a page even is.
- Add the customer's total across all their orders as a second column, without a second round trip.
- Work out which index would help this query, then check whether sqlite agrees with you.
