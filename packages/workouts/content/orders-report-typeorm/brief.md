# The orders report melts under real data

The orders report was written against a test database with a dozen orders in it. It went out to a
customer with four thousand and took most of a minute. Nothing about it is wrong; it is doing the
right work in the wrong place.

## The task

Fix `buildOrdersReport` in `src/server/report.ts`. The report keeps exactly the shape it has now: one
row per order, with the customer's name, how many lines are on it and what it comes to.

Read the loop before you touch it. There is more than one thing going on, and the obvious fix only
solves the first of them.

## How the checkpoints judge it

Not on a stopwatch. On what the report asks the database for.

- Every statement is logged with the number of rows it brought back. The report is run against a
  small database and a larger one, and the number of statements has to be the same for both.
- One query that returns every line item is not a fix. It is one round trip instead of eighty, and
  it still hands thousands of rows to JavaScript so it can add them up. The checkpoints look at row
  counts for that reason.

## Notes

The entities are `EntitySchema` definitions rather than decorated classes, so the columns are named
exactly like the properties. That matters when you put a raw expression into a query builder.

`getRawMany()` gives you the aggregate columns; `getMany()` gives you entities, and an entity has
nowhere to put a `COUNT`.

One order in the fixture has nothing on it at all. That is deliberate.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- The report has no pagination. Add `take` and `skip` and find out what TypeORM does when a
  one-to-many join is in play, and why `getRawMany` and `getMany` disagree about what a page is.
- Add the customer's total across all their orders as a second column, without a second round trip.
- Work out which index would help this query, then check whether sqlite agrees with you.
