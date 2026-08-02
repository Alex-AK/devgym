---
title: The shape of a SELECT
question: Which part of a SELECT runs first, and why does that decide where my alias works?
order: 1
practise:
  - sql-select-genre
  - sql-top-recent
  - sql-in-list
  - sql-like-search
  - sql-between-years
  - sql-distinct-cities
sources:
  - author: SQLite
    title: SELECT
    url: https://www.sqlite.org/lang_select.html
  - author: SQLite
    title: SQL Language Expressions
    url: https://www.sqlite.org/lang_expr.html
  - author: PostgreSQL
    title: SELECT
    url: https://www.postgresql.org/docs/current/sql-select.html
  - author: PostgreSQL
    title: Pattern Matching
    url: https://www.postgresql.org/docs/current/functions-matching.html
  - author: Markus Winand
    title: Paging Through Results
    url: https://use-the-index-luke.com/sql/partial-results/fetch-next-page
verified: 2026-08-01
---

SQLite is the engine on this page, because that is what the SQL problems run against. Postgres
differences are called out where they bite, and the alias rule in the question above is one of them.

## The model

A SELECT is written in one order and answered in another. You write `SELECT` first. It is the fifth
thing that happens:

```
FROM  →  WHERE  →  GROUP BY  →  HAVING  →  SELECT  →  ORDER BY  →  LIMIT
```

`DISTINCT` sits between `SELECT` and `ORDER BY`: the result rows have to exist before duplicates can
be removed from them. SQLite's own documentation lays the steps out in that order while warning that
"neither SQLite nor any other SQL engine is required to follow this or any other specific process".
An engine reorders the real work freely. What it cannot do is produce a different answer, and the
answer is defined by this sequence.

Every rule that looks arbitrary falls out of one line: a clause sees only what the steps before it
produced.

- `WHERE` runs before the result columns are built, so it cannot see an alias and it cannot see an
  aggregate. `WHERE COUNT(*) > 2` fails because no counting has happened yet.
- `HAVING` runs after grouping, so aggregates are exactly what it is for.
- `ORDER BY` runs after the result columns, so an alias is a real name by then.
- `LIMIT` runs last, on the sorted and filtered set. That is why `sql-top-recent` gives you the five
  priciest recent books rather than five arbitrary ones.

Postgres enforces the alias half of that literally. Its SELECT docs: "An output column's name can be
used to refer to the column's value in `ORDER BY` and `GROUP BY` clauses, but not in the `WHERE` or
`HAVING` clauses; there you must write out the expression instead." SQLite is looser and accepts an
alias in `WHERE` anyway. So the honest answer to the question is that in Postgres you cannot, in
SQLite you can, and the trap below is what SQLite does with it.

The vocabulary that carries most of the day-to-day work sits in those steps:

- `IN ('Fantasy', 'Science')` is a chain of `OR` equality tests with the repetition removed.
- `LIKE` matches a pattern, where `%` is any run of characters including none and `_` is exactly one.
  Where you put the wildcards is the whole game: `'The%'` is a prefix match, `'%The'` a suffix, and
  `'%The%'` matches anywhere.
- `BETWEEN a AND b` is inclusive at both ends. SQLite documents it as equivalent to `>= a AND <= b`
  "except that with BETWEEN, the x expression is only evaluated once".
- `DISTINCT` deduplicates the whole result row, not the column standing next to it. Add a second
  column and you usually get every row back.

## Worked example

Against the practice database, which holds 15 books. One query, using every step:

```sql
SELECT title, price * 1.2 AS gross
FROM books
WHERE published_year > 2015
ORDER BY gross DESC
LIMIT 5;
```

```
title                | gross
---------------------+-------
The Restless Atom    | 37.2
Deep Time            | 34.32
Songs of the Hollow  | 32.4
Nine Grams of Doubt  | 29.7
Emberfall            | 27.0
```

`FROM` hands over 15 rows. `WHERE` cuts them to the 10 published after 2015, and it does that with no
idea that `gross` is going to exist. `SELECT` then computes `title` and `gross` for those 10. Only now
is `gross` a name, which is why `ORDER BY gross DESC` works. `LIMIT` takes the top 5 of the sorted
set, not 5 rows chosen before the sort.

Move that same expression into the filter and the two engines part company:

```sql
-- SQLite runs this. Postgres rejects it: WHERE cannot see an output column name.
WHERE published_year > 2015 AND gross > 25

-- Works in both, and always means what it says.
WHERE published_year > 2015 AND price * 1.2 > 25
```

The other four problems on this page, with the row counts this database actually returns:

```sql
SELECT title, genre FROM books WHERE genre IN ('Fantasy', 'Science'); -- 8 of 15
SELECT title FROM books WHERE title LIKE 'The%';                      -- 5 of 15
SELECT title FROM books WHERE published_year BETWEEN 2015 AND 2018;   -- 7 of 15
SELECT DISTINCT city FROM customers;                                  -- 9, from 10 customers
```

## Traps

**A search for "50%" returned every row containing 50.** `%` is the wildcard, so `LIKE '%50%'` matches
"150 pack" as happily as "50% off everything". Name an escape character and the pattern can carry a
literal one: `comment LIKE '%50\%%' ESCAPE '\'` matches the second string and not the first. SQLite
has no default escape character, so dropping the `ESCAPE` clause makes the backslash an ordinary
character to match and the pattern matches neither. Postgres defaults to backslash instead, which is
its own documented departure from the standard. `_` needs the same treatment and gets forgotten more,
because it matches silently: `LIKE 'order_%'` matches "orders" as well as "order_id".

**The monthly report is missing the last day.** `BETWEEN` being inclusive is fine for the integer
years in `sql-between-years` and wrong the moment the column holds a time. In SQLite these columns are
`TEXT` and compare as text, so `'2026-01-31T14:02:00Z' BETWEEN '2026-01-01' AND '2026-01-31'` is
false: any string that starts with the upper bound and keeps going sorts after it. The entire last day
vanishes, not just the afternoon. In Postgres, where the column is a real `timestamp`, `'2026-01-31'`
is midnight on the 31st, so you keep the rows stamped exactly 00:00:00 and lose the rest. Write the
half-open form and neither engine can surprise you: `>= '2026-01-01' AND < '2026-02-01'`.

**The same query returned different rows the second time.** `ORDER BY` says nothing about rows that
tie, and `LIMIT` then cuts the set wherever the tie happened to fall.
`SELECT title, genre FROM books ORDER BY genre LIMIT 3` returns The Glass Kingdom, Emberfall and The
Last Cartographer against a plain table scan; add an index on `(genre, title DESC)` and the identical
statement returns Winterlight, The Last Cartographer and The Glass Kingdom. The data did not change,
only the plan. Markus Winand puts it as a definition rather than a warning: "Without a deterministic
`order by` clause, the database by definition does not deliver a deterministic row sequence." Append a
unique column, `ORDER BY genre, id`, and the result is pinned. This is the fact keyset pagination
rests on, and it is why `sql-top-recent` can grade on row order at all: no two of the eligible books
share a price.

**The search matched locally and stopped matching in production.** SQLite's `LIKE` is case-insensitive
by default, but only across ASCII. The docs are exact about the boundary: "'a' LIKE 'A' is TRUE but
'æ' LIKE 'Æ' is FALSE". So `title LIKE 'the%'` finds the same 5 books as `'The%'`, while `'Émile' LIKE
'émile'` is false in the same query that says `'Emile' LIKE 'emile'` is true. Postgres `LIKE` is case
sensitive unless the column's collation says otherwise, and `ILIKE` is the explicit case-insensitive
form, "not in the SQL standard but a PostgreSQL extension". A pattern written against the practice
database narrows without complaint when it moves.

**The alias in the `WHERE` clause ran, and the wrong rows came back.** SQLite resolves a name in
`WHERE` against the table's columns first and only then against the result aliases. So
`SELECT title, price * 2 AS published_year FROM books WHERE published_year > 2015` returns rows,
filtered on the column, never on `price * 2`. Nothing warns you, and Postgres would have refused the
statement outright. Repeat the expression in the `WHERE` clause, or push the projection into a
subquery or CTE where the alias is a genuine column of the input:
`SELECT title, gross FROM (SELECT title, price * 1.2 AS gross FROM books) WHERE gross > 35`.
