# Sortable employee table, end to end

The employee list works, and it paginates. Product wants to sort it.

## The task

Add sorting to the employee list, backend and frontend.

**Backend** (`src/server/employees.ts`)

`listEmployees` currently takes `{ page, limit }`. Extend it to accept `sort` and `dir`:

- `sort` is one of `name`, `department`, `salary`, `startedAt`. Default `name`.
- `dir` is `asc` or `desc`. Default `asc`.
- The ordering has to be applied **in the query**, so it is correct across pages.
- An unknown column must not reach the SQL. Reject it or fall back, but never interpolate it.

**Frontend** (`src/client/EmployeeTable.tsx`)

- Clicking a column header sorts by that column, ascending.
- Clicking the header of the column already sorted flips the direction.
- The current sort column and direction are visible to the user.
- Changing the sort goes back to page 1, because staying on page 4 of a different ordering is meaningless.

## Notes

The data is seeded and deterministic: 12 employees across 3 departments, with deliberate ties in
`department` so you can see whether your ordering is stable.

`npm`-style commands are not available here. Hit **Run checkpoints** to see where you are.

## If you finish early

- Make the tie-break explicit so equal departments come back in a stable order.
- Add `nullsLast` handling for `startedAt`, which is nullable for two rows.
- Have the client show a loading state while a re-sort is in flight, without unmounting the table.
