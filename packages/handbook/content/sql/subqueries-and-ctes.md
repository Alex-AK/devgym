---
title: Subqueries and CTEs
question: Should this be a subquery, a CTE or a join, and does the database care?
order: 6
practise:
  - sql-subquery-above-avg
  - sql-cte-first-order
  - sql-not-exists
  - sql-recursive-hierarchy
  - sql-repeat-customers
sources:
  - author: SQLite
    title: The WITH Clause
    url: https://www.sqlite.org/lang_with.html
  - author: SQLite
    title: SQL Language Expressions
    url: https://www.sqlite.org/lang_expr.html
  - author: SQLite
    title: Row Values
    url: https://www.sqlite.org/rowvalue.html
  - author: PostgreSQL
    title: WITH Queries (Common Table Expressions)
    url: https://www.postgresql.org/docs/current/queries-with.html
  - author: PostgreSQL
    title: Subquery Expressions
    url: https://www.postgresql.org/docs/current/functions-subquery.html
  - author: PostgreSQL
    title: PostgreSQL 12 Release Notes
    url: https://www.postgresql.org/docs/release/12.0/
  - author: Markus Winand
    title: with — Organize Complex Queries
    url: https://modern-sql.com/feature/with
verified: 2026-08-01
---

SQLite is the engine on this page, because that is what the SQL problems run against. Every plan
and row count below came from running the query against the seeded `practice.db` on SQLite 3.53.2,
the version the app bundles. Postgres differs in two places, and both are marked.

## The model

A subquery is a `SELECT` inside another statement. It has three shapes, and the shape decides where
it is allowed to sit.

**Scalar.** One row, one column, so it is a value and goes anywhere a value goes: the select list,
`WHERE`, `HAVING`, the middle of an expression. That is the whole of `sql-subquery-above-avg`.
`WHERE price > AVG(price)` is rejected because `WHERE` runs before aggregation, while
`WHERE price > (SELECT AVG(price) FROM books)` compares against a number like any other. Return a
second column by accident and SQLite stops you with `row value misused`.

**List.** One column, any number of rows, feeding `IN`. SQLite also takes a row value on the left
(`(order_id, book_id) IN (SELECT o.id, b.id FROM …)`), which it has supported since version 3.15.0
in 2016. `EXISTS` is the degenerate case: it ignores the columns completely and reports only whether
a row came back. The SQLite manual is blunt about it: "The number of columns in each row returned by
the SELECT statement (if any) and the specific values returned have no effect on the results of the
EXISTS operator." That is why the convention is `SELECT 1`.

**Table.** A `SELECT` in `FROM`. It is a table for the length of the query and nothing outside it.

The distinction that decides how a subquery runs is not its shape, it is whether it mentions the
outer row. An **uncorrelated** subquery is self-contained, so it could be computed once before
anything else starts. A **correlated** one reads a column from the query around it, so conceptually
it runs once per outer row. SQLite tells the two apart by name:

```
-- SELECT title FROM books WHERE price > (SELECT avg(price) FROM books);
SCAN books
SCALAR SUBQUERY 1

-- SELECT b.title, (SELECT avg(price) FROM books g WHERE g.genre = b.genre) FROM books b;
SCAN b
CORRELATED SCALAR SUBQUERY 1
```

"Conceptually" is carrying weight in that sentence. A planner is free to rewrite a correlated
subquery as a join and often does. What it cannot do is see through one whose per-row answer depends
on something it cannot rearrange, and that is when you pay for every row.

### EXISTS, IN and a join

Three ways to ask which customers ever bought Fantasy, and they are not interchangeable.

- A **join** answers with one row per match. Eight customers bought Fantasy across 14 matching order
  lines, so the join returns 14 rows and needs a `DISTINCT` or a `GROUP BY` to get back to 8. That
  multiplication is [what a join does](./what-a-join-does.md).
- **`EXISTS`** cannot multiply anything. It is a predicate on the outer row: keep it or drop it,
  never duplicate it. It also stops early. Postgres documents that the subquery "will generally only
  be executed long enough to determine whether at least one row is returned, not all the way to
  completion".
- **`IN`** matches the join for a single column, as long as nothing is NULL. One NULL among the
  subquery's results and `NOT IN` returns nothing at all, with no error:
  [NULL is not a value](./null-is-not-a-value.md) has the truth table. Plain `IN` survives a NULL,
  `NOT IN` does not.

### WITH, and whether it is a fence

A CTE is a name for a subquery, written above the query that uses it instead of inside it. Winand's
framing is the one to keep: a statement-scoped view, valid only in the query it belongs to. Nothing
about the rows changes. What changes is that the name is declared once, can be referenced more than
once, and turns three stacked transformations into something you read top to bottom rather than
inside out.

Whether it is also an optimisation fence is engine- and version-specific, so it is not a fact you
can carry across:

- **Postgres 11 and earlier** never inlined. The version-11 manual says WITH queries "are evaluated
  only once per execution of the parent query, even if they are referred to more than once", and
  warns that "the optimizer is less able to push restrictions from the parent query down into a
  `WITH` query than an ordinary subquery".
- **Postgres 12 and later** inline by default. From the release notes: "CTEs are automatically
  inlined if they have no side-effects, are not recursive, and are referenced only once in the
  query." `MATERIALIZED` forces the old behaviour back, and `NOT MATERIALIZED` forces inlining even
  where the CTE is referenced several times.
- **SQLite** publishes no rule. Without a hint, "SQLite is free to choose whatever implementation
  strategy it thinks will work best", and the manual asks you to leave it alone: "Do not use the
  MATERIALIZED or NOT MATERIALIZED keywords on a common table expression unless you have a
  compelling reason to do so." Those two keywords exist from version 3.35.0, released in 2021.

You can watch SQLite choose. Left alone, it pushed the outer filter into the CTE and used the
primary key; told to materialise, it built the ephemeral table first and scanned it:

```
-- WITH cheap AS (SELECT id, title FROM books WHERE price < 20)
-- SELECT * FROM cheap WHERE id = 3;
SEARCH books USING INTEGER PRIMARY KEY (rowid=?)

-- WITH cheap AS MATERIALIZED (SELECT id, title FROM books WHERE price < 20)
-- SELECT * FROM cheap WHERE id = 3;
MATERIALIZE cheap
SCAN books
SCAN cheap
```

So the answer to "does the database care which I wrote" is: read the plan on the engine you are
running, and do not port the conclusion.

## Worked example

Which customers placed more than one completed order? That is `sql-repeat-customers`, and here it is
in three shapes. All three return the same 6 rows.

A table subquery in `FROM`, aggregating first and attaching names second:

```sql
SELECT c.name, t.order_count
FROM (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
) AS t
JOIN customers c ON c.id = t.customer_id
WHERE t.order_count > 1;
```

A correlated scalar subquery, which reads `c.id` from the row being tested:

```sql
SELECT
  c.name,
  (SELECT COUNT(*) FROM orders o
    WHERE o.customer_id = c.id AND o.status = 'completed') AS order_count
FROM customers c
WHERE (SELECT COUNT(*) FROM orders o
        WHERE o.customer_id = c.id AND o.status = 'completed') > 1;
```

The same subquery is written twice, once to filter and once to display. The duplication is the tell.

And the CTE, which is the first version with the subquery lifted out and given a name:

```sql
WITH completed_counts AS (
  SELECT customer_id, COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY customer_id
)
SELECT c.name, cc.order_count
FROM completed_counts cc
JOIN customers c ON c.id = cc.customer_id
WHERE cc.order_count > 1;
```

The answer the problem grades is shorter than all three, because a plain join with
`HAVING COUNT(*) > 1` says the same thing. Reach for a subquery when the aggregate has to be
compared against something computed at a different grain, which is where `sql-cte-first-order`
lands.

Recursion is the one job no subquery can do, and it is `sql-recursive-hierarchy`:

```sql
WITH RECURSIVE chart AS (
  SELECT id, name, 0 AS depth
  FROM employees
  WHERE manager_id IS NULL -- anchor: the rows with no parent
  UNION ALL
  SELECT e.id, e.name, chart.depth + 1
  FROM employees e
  JOIN chart ON e.manager_id = chart.id -- step: joins onto the previous round
)
SELECT name, depth FROM chart;
```

The anchor is the termination argument. It seeds the result with 1 row, the CEO. Each round then
joins in the employees whose `manager_id` turned up in the round before: 2 rows, then 9, then none,
which is where it stops. Twelve rows out of a twelve-row table, each carrying its distance from the
root.

## Traps

**One statement, and it slows down in a straight line as the table grows.** A correlated subquery in
the select list is evaluated per output row, so a report over 10,000 customers can run 10,000 inner
queries inside a single statement. It is [N+1](../databases/n-plus-one.md) with the loop moved into
the database, and counting statements will never find it, because there is only ever one. The plan
is where it shows, as a `CORRELATED SCALAR SUBQUERY` node. A `LEFT JOIN` with `GROUP BY`, or a
window function, computes the column once instead.

**An anti-join returns zero rows and raises nothing.**
`WHERE id NOT IN (SELECT manager_id FROM employees)` over 12 employees returns 0 rows, because one
`manager_id` is NULL and `NOT IN` expands to an `AND` chain of inequalities that can never come out
true. The `NOT EXISTS` form returns the 9 rows you wanted, which is `sql-not-exists`. Mechanism in
[NULL is not a value](./null-is-not-a-value.md). Rule of thumb: `NOT IN` over a nullable column is
a bug until proven otherwise.

**The row count jumped when you rewrote EXISTS as a join.** `EXISTS` filters the outer row and
cannot duplicate it; a join to a child table emits one row per match, so 8 customers came back as 14. Bolting `DISTINCT` on top fixes the count and hides the reason. When the question is which rows
qualify rather than what they matched, `EXISTS` says exactly that and stays at one row each.

**A recursive CTE never returns.** The step keeps producing rows it has already produced, which is
what a cycle in the data does: two employees managing each other, a category that is its own
ancestor. `UNION` instead of `UNION ALL` is SQLite's documented answer, and its own graph example
uses it "to prevent the recursion from entering an infinite loop if the graph contains cycles". A
depth column with `WHERE depth < 20` is the cruder guard and also caps the damage when the cycle is
in one row out of a million. The anchor is the other half: it has to select the roots and only the
roots, or every row seeds its own traversal and you get the tree back once per node.

**The same query parses in one engine and not the other.** SQLite accepts `FROM (SELECT …)` with
no alias. Postgres accepts it from version 16 and rejected it before that. Name the subquery anyway.
You need the name to qualify a column the moment a second table joins the query, and `AS t` is
cheaper than finding out on a different engine.
