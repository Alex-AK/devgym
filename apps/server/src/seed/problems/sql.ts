import { md, type ProblemDraft, sqlProblem } from './types';

/**
 * SQL problems run against practice.db. Grading compares raw row values against
 * the canonical query executed at the same moment, so aliases never matter —
 * but row order does wherever `orderMatters` is true, and those queries are
 * chosen so the sort key has no ties.
 */
export const sqlProblems: ProblemDraft[] = [
  sqlProblem({
    slug: 'sql-select-genre',
    title: 'Filter books by genre',
    difficulty: 'easy',
    prompt: md(
      'List the titles of all books in the **Fantasy** genre.',
      '',
      "Return one column: `title`. Row order doesn't matter."
    ),
    solutionSql: "SELECT title FROM books WHERE genre = 'Fantasy';",
    orderMatters: false,
    solutionSource: ['SELECT title', 'FROM books', "WHERE genre = 'Fantasy';"],
    hints: [
      'You only need the `books` table.',
      "Filter rows with `WHERE genre = 'Fantasy'`. String literals use single quotes.",
    ],
    explanation:
      '`WHERE` filters rows before they are returned, so only the Fantasy rows survive. String literals in SQLite use **single** quotes. Double quotes mean *identifier* (a column or table name), which is why `WHERE genre = "Fantasy"` usually fails with "no such column". Selecting just `title` keeps the result to one column, which is what the problem asked for.',
  }),

  sqlProblem({
    slug: 'sql-top-recent',
    title: 'Five priciest recent books',
    difficulty: 'easy',
    prompt: md(
      'Show the **title and price** of the 5 most expensive books published after 2015, most expensive first.',
      '',
      'Columns: `title`, `price`. **Row order matters here.**'
    ),
    solutionSql:
      'SELECT title, price FROM books WHERE published_year > 2015 ORDER BY price DESC LIMIT 5;',
    orderMatters: true,
    solutionSource: [
      'SELECT title, price',
      'FROM books',
      'WHERE published_year > 2015',
      'ORDER BY price DESC',
      'LIMIT 5;',
    ],
    hints: [
      'Combine a WHERE filter with ORDER BY.',
      '`ORDER BY price DESC` sorts high→low; `LIMIT 5` keeps the top 5.',
    ],
    explanation:
      'SQL evaluates `WHERE` first, then `ORDER BY`, then `LIMIT`, so the limit applies to the *sorted, filtered* set, not to the raw table. Swapping that mental order is the classic bug: filtering after limiting would give you the 5 priciest books overall and then throw some away. `> 2015` excludes 2015 itself; use `>= 2016` if you prefer, it is the same set for integer years.',
  }),

  sqlProblem({
    slug: 'sql-distinct-cities',
    title: 'Deduplicate a column',
    difficulty: 'easy',
    prompt: md(
      'Two customers live in Bristol. List each customer **city exactly once**.',
      '',
      "One column: `city`. Row order doesn't matter."
    ),
    solutionSql: 'SELECT DISTINCT city FROM customers;',
    orderMatters: false,
    hints: [
      'There is a keyword that collapses duplicate rows.',
      '`SELECT DISTINCT city FROM customers`. DISTINCT applies to the whole selected row, not to one column.',
    ],
    explanation:
      '`DISTINCT` deduplicates the **entire selected row**, not the column it appears next to. `SELECT DISTINCT city, name` would give you every row back, because the name makes each pair unique. `GROUP BY city` would also work and is what you reach for once you need a count alongside. On a large table both need to sort or hash the rows, so neither is free.',
  }),

  sqlProblem({
    slug: 'sql-count-genre',
    title: 'Count matching rows',
    difficulty: 'easy',
    prompt: md(
      'How many books are in the **Mystery** genre?',
      '',
      'Return a single row with a single column holding the count.'
    ),
    solutionSql: "SELECT COUNT(*) FROM books WHERE genre = 'Mystery';",
    orderMatters: false,
    hints: [
      'Aggregate functions collapse many rows into one.',
      '`SELECT COUNT(*) FROM books WHERE genre = ...`',
    ],
    explanation:
      '`COUNT(*)` counts rows that survived the `WHERE`, so filtering and counting compose naturally. `COUNT(column)` is different. It skips NULLs in that column, which is exactly what you want when counting "how many rows actually have a value". An aggregate with no `GROUP BY` always returns exactly one row, even when nothing matched (you get 0, not an empty result).',
  }),

  sqlProblem({
    slug: 'sql-null-check',
    title: 'Find NULLs',
    difficulty: 'easy',
    prompt: md(
      'Some reviews were left without written feedback. Return the `id` of every review whose `comment` is NULL.',
      '',
      "One column: `id`. Row order doesn't matter."
    ),
    solutionSql: 'SELECT id FROM reviews WHERE comment IS NULL;',
    orderMatters: false,
    hints: [
      'NULL is not a value you can compare with `=`.',
      'Use `WHERE comment IS NULL`. `= NULL` is never true.',
    ],
    explanation:
      "NULL means *unknown*, so `comment = NULL` evaluates to NULL rather than true, and `WHERE` only keeps rows where the condition is **true**: you get zero rows back and no error, which is why this bug survives code review. `IS NULL` / `IS NOT NULL` are the only correct tests. The same trap bites `!=`: `comment != 'x'` silently drops NULL rows too.",
  }),

  sqlProblem({
    slug: 'sql-in-list',
    title: 'Match any of several values',
    difficulty: 'easy',
    prompt: md(
      'List the title and genre of every book in the **Fantasy** or **Science** genre.',
      '',
      "Columns: `title`, `genre`. Row order doesn't matter."
    ),
    solutionSql: "SELECT title, genre FROM books WHERE genre IN ('Fantasy', 'Science');",
    orderMatters: false,
    hints: [
      'You could write two conditions joined with OR. There is a shorter way.',
      "`WHERE genre IN ('Fantasy', 'Science')`",
    ],
    explanation:
      "`IN (…)` is shorthand for a chain of `OR` equality checks and reads far better once the list grows. Watch out for `NOT IN` combined with NULLs: if the list contains a NULL, `NOT IN` returns NULL for every row and you get nothing back. `NOT EXISTS` is the safe alternative. `IN` also accepts a subquery, which is how you filter by another table's keys.",
  }),

  sqlProblem({
    slug: 'sql-like-search',
    title: 'Pattern matching',
    difficulty: 'easy',
    prompt: md(
      'Find every book whose title **starts with** `The`.',
      '',
      "One column: `title`. Row order doesn't matter."
    ),
    solutionSql: "SELECT title FROM books WHERE title LIKE 'The%';",
    orderMatters: false,
    hints: [
      'Pattern matching uses a dedicated operator, not `=`.',
      '`%` matches any run of characters. Where you put it decides the shape of the match.',
      "`LIKE 'The%'` anchors at the start; `'%The%'` would match anywhere.",
    ],
    explanation:
      "`LIKE` matches patterns where `%` is any sequence of characters and `_` is exactly one. Wildcard placement is the whole game: `'The%'` is a prefix match, `'%The'` a suffix match, `'%The%'` a contains match. Only the prefix form can use a normal B-tree index. A leading `%` forces a full scan, which is why production \"search\" boxes end up on a full-text index. Also note SQLite's `LIKE` is case-insensitive for ASCII by default, unlike Postgres where you would need `ILIKE`.",
  }),

  sqlProblem({
    slug: 'sql-between-years',
    title: 'Inclusive range filter',
    difficulty: 'easy',
    prompt: md(
      'List the title and publication year of books published from **2015 to 2018 inclusive**.',
      '',
      "Columns: `title`, `published_year`. Row order doesn't matter."
    ),
    solutionSql:
      'SELECT title, published_year FROM books WHERE published_year BETWEEN 2015 AND 2018;',
    orderMatters: false,
    hints: [
      'Two comparisons would work; one operator does it in a single expression.',
      '`BETWEEN 2015 AND 2018` is inclusive at both ends.',
    ],
    explanation:
      "`BETWEEN a AND b` is inclusive on both sides. Identical to `>= a AND <= b`. That inclusivity is a real hazard with timestamps: `BETWEEN '2024-01-01' AND '2024-01-31'` silently drops everything that happened during the 31st after midnight. For date ranges prefer the half-open form `>= start AND < next_start`.",
  }),

  sqlProblem({
    slug: 'sql-orders-per-customer',
    title: 'Completed orders per customer',
    difficulty: 'medium',
    prompt: md(
      'For **every** customer, show their name and how many **completed** orders they have placed. Including customers with zero.',
      '',
      "Columns: `name`, `order_count`. Row order doesn't matter."
    ),
    solutionSql:
      "SELECT c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed' GROUP BY c.id, c.name;",
    orderMatters: false,
    solutionSource: [
      'SELECT c.name, COUNT(o.id) AS order_count',
      'FROM customers c',
      'LEFT JOIN orders o',
      "  ON o.customer_id = c.id AND o.status = 'completed'",
      'GROUP BY c.id, c.name;',
    ],
    hints: [
      '"Including zero" means an INNER JOIN won\'t work.',
      'Careful: filtering status in WHERE turns a LEFT JOIN back into an inner join. Put the status condition in the ON clause.',
      'COUNT(o.id) counts matched rows only; COUNT(*) would count zero-order customers as 1.',
    ],
    explanation:
      "A `LEFT JOIN` keeps every customer row and fills the order columns with NULL when nothing matches. The trap is **ON vs WHERE**: `WHERE o.status = 'completed'` runs *after* the join and discards those NULL rows, silently turning the LEFT JOIN back into an inner join, so customers with no completed orders vanish. Putting the condition in `ON` makes it part of the match instead. Finally, `COUNT(o.id)` ignores NULLs and correctly reports 0, whereas `COUNT(*)` counts the customer row itself and reports 1.",
  }),

  sqlProblem({
    slug: 'sql-anti-join',
    title: 'Rows with no match (anti-join)',
    difficulty: 'medium',
    prompt: md(
      'Three books have never been reviewed. List their titles.',
      '',
      "One column: `title`. Row order doesn't matter."
    ),
    solutionSql:
      'SELECT b.title FROM books b LEFT JOIN reviews r ON r.book_id = b.id WHERE r.id IS NULL;',
    orderMatters: false,
    solutionSource: [
      'SELECT b.title',
      'FROM books b',
      'LEFT JOIN reviews r ON r.book_id = b.id',
      'WHERE r.id IS NULL;',
    ],
    hints: [
      'Start from every book and attach reviews optionally.',
      'After a LEFT JOIN, unmatched rows have NULL in every column from the right table.',
      '`WHERE r.id IS NULL` keeps exactly the books that matched nothing.',
    ],
    explanation:
      'This is the **anti-join** pattern: LEFT JOIN to the other table, then keep only the rows where the right side came back NULL. It works because a LEFT JOIN NULL-pads non-matches, so `r.id IS NULL` can only be true when no review existed. `NOT EXISTS (SELECT 1 FROM reviews r WHERE r.book_id = b.id)` expresses the same thing and is usually clearer; `NOT IN` is the one to avoid, because a single NULL in the subquery makes it return nothing at all.',
  }),

  sqlProblem({
    slug: 'sql-having-avg',
    title: 'Filter on an aggregate',
    difficulty: 'medium',
    prompt: md(
      'Show each book that has **3 or more reviews**, with its average rating.',
      '',
      "Columns: `title`, `avg_rating`. Row order doesn't matter."
    ),
    solutionSql:
      'SELECT b.title, AVG(r.rating) AS avg_rating FROM books b JOIN reviews r ON r.book_id = b.id GROUP BY b.id, b.title HAVING COUNT(r.id) >= 3;',
    orderMatters: false,
    solutionSource: [
      'SELECT b.title, AVG(r.rating) AS avg_rating',
      'FROM books b',
      'JOIN reviews r ON r.book_id = b.id',
      'GROUP BY b.id, b.title',
      'HAVING COUNT(r.id) >= 3;',
    ],
    hints: [
      'You cannot filter on COUNT(...) in a WHERE clause.',
      '`WHERE` runs before grouping; `HAVING` runs after.',
      '`GROUP BY b.id, b.title HAVING COUNT(r.id) >= 3`',
    ],
    explanation:
      '`WHERE` filters individual rows *before* they are grouped, so aggregates do not exist yet and `WHERE COUNT(*) >= 3` is a syntax error. `HAVING` filters the **groups** after aggregation, which is where conditions on `COUNT`, `SUM` or `AVG` belong. Group by `b.id` as well as `b.title` so two books that happened to share a title would still be separate groups. Grouping by the primary key is the habit worth keeping.',
  }),

  sqlProblem({
    slug: 'sql-coalesce-stock',
    title: 'Default a missing value',
    difficulty: 'medium',
    prompt: md(
      'Three books have no row in `inventory` at all. List **every** book with its stock level, showing `0` for books with no inventory record.',
      '',
      "Columns: `title`, `stock`. Row order doesn't matter."
    ),
    solutionSql:
      'SELECT b.title, COALESCE(i.stock, 0) AS stock FROM books b LEFT JOIN inventory i ON i.book_id = b.id;',
    orderMatters: false,
    solutionSource: [
      'SELECT b.title, COALESCE(i.stock, 0) AS stock',
      'FROM books b',
      'LEFT JOIN inventory i ON i.book_id = b.id;',
    ],
    hints: [
      'Every book must appear, so the join has to be a LEFT JOIN.',
      'A missing inventory row leaves `i.stock` NULL. You need to substitute a value.',
      '`COALESCE(i.stock, 0)` returns the first non-NULL argument.',
    ],
    explanation:
      '`COALESCE(a, b, …)` returns its first non-NULL argument, which is the standard way to give a LEFT JOIN a sensible default. It matters for arithmetic too: `stock - 1` is NULL when stock is NULL, so a single missing row poisons the whole expression silently. `IFNULL(x, 0)` is the SQLite-specific two-argument version. `COALESCE` is the portable one.',
  }),

  sqlProblem({
    slug: 'sql-self-join',
    title: 'Join a table to itself',
    difficulty: 'medium',
    prompt: md(
      "The `employees` table points at itself through `manager_id`. List every employee with their manager's name.",
      '',
      "Include the CEO, whose `manager_id` is NULL. Their manager name should come back NULL. Columns: `name`, `manager_name`. Row order doesn't matter."
    ),
    solutionSql:
      'SELECT e.name, m.name AS manager_name FROM employees e LEFT JOIN employees m ON m.id = e.manager_id;',
    orderMatters: false,
    solutionSource: [
      'SELECT e.name, m.name AS manager_name',
      'FROM employees e',
      'LEFT JOIN employees m ON m.id = e.manager_id;',
    ],
    hints: [
      'The same table can appear twice in one query if you alias it.',
      'Alias the two copies `e` (employee) and `m` (manager).',
      'A plain JOIN would drop the CEO. Use LEFT JOIN so a NULL manager_id survives.',
    ],
    explanation:
      'A **self-join** is an ordinary join where both sides happen to be the same table; the aliases are what make it work, since `employees.name` would otherwise be ambiguous. `LEFT JOIN` is essential here. The CEO has a NULL `manager_id`, which matches nothing, so an inner join would quietly drop them. This same shape handles any parent/child hierarchy one level deep; for arbitrary depth you need a recursive CTE.',
  }),

  sqlProblem({
    slug: 'sql-direct-reports',
    title: 'Count children per parent',
    difficulty: 'medium',
    prompt: md(
      'For each employee who manages at least one person, show their name and how many **direct** reports they have, most reports first.',
      '',
      'Columns: `name`, `reports`. **Row order matters here.**'
    ),
    solutionSql:
      'SELECT m.name, COUNT(e.id) AS reports FROM employees m JOIN employees e ON e.manager_id = m.id GROUP BY m.id, m.name ORDER BY reports DESC;',
    orderMatters: true,
    solutionSource: [
      'SELECT m.name, COUNT(e.id) AS reports',
      'FROM employees m',
      'JOIN employees e ON e.manager_id = m.id',
      'GROUP BY m.id, m.name',
      'ORDER BY reports DESC;',
    ],
    hints: [
      'Self-join again, but this time you want managers on the left.',
      'An inner join is right here. Managers with no reports should not appear.',
      'Group by the manager and count the joined employee rows.',
    ],
    explanation:
      'Flipping which side of the self-join you group by flips the question from "who is my manager" to "who reports to me". An **inner** join is correct this time, because the problem explicitly excludes managers with no reports. That filtering falls out of the join for free instead of needing a HAVING clause. You can sort by the alias `reports` because `ORDER BY` is evaluated after the select list, unlike `WHERE`.',
  }),

  sqlProblem({
    slug: 'sql-date-month',
    title: 'Group by month',
    difficulty: 'medium',
    prompt: md(
      'Count **completed** orders per calendar month, oldest month first.',
      '',
      'Format the month as `YYYY-MM`. Columns: `month`, `orders`. **Row order matters here.**'
    ),
    solutionSql:
      "SELECT strftime('%Y-%m', ordered_at) AS month, COUNT(*) AS orders FROM orders WHERE status = 'completed' GROUP BY month ORDER BY month;",
    orderMatters: true,
    solutionSource: [
      "SELECT strftime('%Y-%m', ordered_at) AS month, COUNT(*) AS orders",
      'FROM orders',
      "WHERE status = 'completed'",
      'GROUP BY month',
      'ORDER BY month;',
    ],
    hints: [
      'You need to truncate a date down to its month before grouping.',
      'SQLite formats dates with `strftime(format, column)`.',
      "`strftime('%Y-%m', ordered_at)` gives `2023-01`, and you can GROUP BY that alias.",
    ],
    explanation:
      "Grouping by time always means projecting the timestamp down to the bucket you want first. `strftime('%Y-%m', …)` in SQLite, `date_trunc('month', …)` in Postgres, `DATE_FORMAT` in MySQL. Formatting as `YYYY-MM` is deliberate: it sorts lexicographically in true chronological order, which `MM-YYYY` would not. Note that SQLite lets you `GROUP BY` a select-list alias; standard SQL strictly does not, so portable code repeats the expression.",
  }),

  sqlProblem({
    slug: 'sql-repeat-customers',
    title: 'Customers who came back',
    difficulty: 'medium',
    prompt: md(
      'Find the customers who placed **more than one completed order**, with their order count.',
      '',
      "Columns: `name`, `order_count`. Row order doesn't matter."
    ),
    solutionSql:
      "SELECT c.name, COUNT(*) AS order_count FROM customers c JOIN orders o ON o.customer_id = c.id WHERE o.status = 'completed' GROUP BY c.id, c.name HAVING COUNT(*) > 1;",
    orderMatters: false,
    solutionSource: [
      'SELECT c.name, COUNT(*) AS order_count',
      'FROM customers c',
      'JOIN orders o ON o.customer_id = c.id',
      "WHERE o.status = 'completed'",
      'GROUP BY c.id, c.name',
      'HAVING COUNT(*) > 1;',
    ],
    hints: [
      'Both a WHERE and a HAVING clause are needed here.',
      'Filter the rows (status) with WHERE, filter the groups (count) with HAVING.',
    ],
    explanation:
      'This is the canonical shape of a cohort query: `WHERE` narrows the rows, `GROUP BY` collapses them per customer, `HAVING` keeps only the groups that clear a threshold. Because this is an inner join, the status filter is safe in `WHERE`. There are no NULL-padded rows to protect, unlike the LEFT JOIN case. Swap `> 1` for `>= 3` and you have a "power user" query with no restructuring.',
  }),

  sqlProblem({
    slug: 'sql-subquery-above-avg',
    title: 'Compare against an aggregate',
    difficulty: 'medium',
    prompt: md(
      'List the books priced **above the average price** of all books.',
      '',
      "Columns: `title`, `price`. Row order doesn't matter."
    ),
    solutionSql: 'SELECT title, price FROM books WHERE price > (SELECT AVG(price) FROM books);',
    orderMatters: false,
    solutionSource: [
      'SELECT title, price',
      'FROM books',
      'WHERE price > (SELECT AVG(price) FROM books);',
    ],
    hints: [
      '`WHERE price > AVG(price)` is not allowed. Aggregates cannot appear in WHERE.',
      'Compute the average in a subquery and compare against that single value.',
      '`WHERE price > (SELECT AVG(price) FROM books)`',
    ],
    explanation:
      'A **scalar subquery** returns exactly one value, so it can sit anywhere a literal could. Including inside `WHERE`, where a bare aggregate is illegal. This one is *uncorrelated*: it does not reference the outer query, so the database evaluates it once rather than per row. Make it correlated (say, the average within the same genre) and it conceptually runs per row, which is when you start reaching for a window function instead.',
  }),

  sqlProblem({
    slug: 'sql-case-buckets',
    title: 'Bucket rows with CASE',
    difficulty: 'medium',
    prompt: md(
      'Bucket every book by price and count each bucket:',
      '',
      '- under 15 → `budget`',
      '- 15 up to but not including 25 → `standard`',
      '- 25 and over → `premium`',
      '',
      "Columns: `band`, `books`. Row order doesn't matter."
    ),
    solutionSql:
      "SELECT CASE WHEN price < 15 THEN 'budget' WHEN price < 25 THEN 'standard' ELSE 'premium' END AS band, COUNT(*) AS books FROM books GROUP BY band;",
    orderMatters: false,
    solutionSource: [
      'SELECT CASE',
      "         WHEN price < 15 THEN 'budget'",
      "         WHEN price < 25 THEN 'standard'",
      "         ELSE 'premium'",
      '       END AS band,',
      '       COUNT(*) AS books',
      'FROM books',
      'GROUP BY band;',
    ],
    hints: [
      'You need a computed column before you can group by it.',
      '`CASE WHEN … THEN … WHEN … THEN … ELSE … END`',
      'CASE stops at the first matching WHEN, so the second branch only sees prices >= 15.',
    ],
    explanation:
      '`CASE` evaluates its branches **in order** and stops at the first match, so the second condition only needs `price < 25`. The `< 15` rows were already claimed. That short-circuit is what keeps bucket definitions from needing overlapping range checks. Always include an `ELSE`: without one, unmatched rows get NULL and quietly form a mystery group.',
  }),

  sqlProblem({
    slug: 'sql-order-totals',
    title: 'Total value per order',
    difficulty: 'medium',
    prompt: md(
      'For every **completed** order, compute its total value (`quantity × unit_price` summed across its items). Highest total first.',
      '',
      'Columns: `id`, `total`. **Row order matters here.**'
    ),
    solutionSql:
      "SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY o.id ORDER BY total DESC;",
    orderMatters: true,
    solutionSource: [
      'SELECT o.id, SUM(oi.quantity * oi.unit_price) AS total',
      'FROM orders o',
      'JOIN order_items oi ON oi.order_id = o.id',
      "WHERE o.status = 'completed'",
      'GROUP BY o.id',
      'ORDER BY total DESC;',
    ],
    hints: [
      'The line items live in `order_items`; the status lives in `orders`.',
      'Multiply *before* you aggregate: SUM(quantity * unit_price).',
      'Group by the order id so each order collapses to one row.',
    ],
    explanation:
      'The row-level expression `quantity * unit_price` is evaluated per line item and *then* summed. `SUM(quantity) * SUM(unit_price)` is a completely different (and wrong) number, and it is the single most common mistake in this shape of query. Grouping by `o.id` is enough because it is the primary key: SQLite and Postgres both let you select other columns from that table once you group by its key.',
  }),

  sqlProblem({
    slug: 'sql-not-exists',
    title: 'Customers who never bought Fantasy',
    difficulty: 'medium',
    prompt: md(
      'Which customers have **never** ordered a Fantasy book? Count every order regardless of status.',
      '',
      "One column: `name`. Row order doesn't matter."
    ),
    solutionSql:
      "SELECT c.name FROM customers c WHERE NOT EXISTS (SELECT 1 FROM orders o JOIN order_items oi ON oi.order_id = o.id JOIN books b ON b.id = oi.book_id WHERE o.customer_id = c.id AND b.genre = 'Fantasy');",
    orderMatters: false,
    solutionSource: [
      'SELECT c.name',
      'FROM customers c',
      'WHERE NOT EXISTS (',
      '  SELECT 1',
      '  FROM orders o',
      '  JOIN order_items oi ON oi.order_id = o.id',
      '  JOIN books b       ON b.id = oi.book_id',
      "  WHERE o.customer_id = c.id AND b.genre = 'Fantasy'",
      ');',
    ],
    hints: [
      'You need "no matching row exists", not "some row does not match".',
      'A correlated subquery can reference the outer row: `WHERE o.customer_id = c.id`.',
      'Wrap it in `NOT EXISTS ( … )`.',
    ],
    explanation:
      '`NOT EXISTS` with a **correlated** subquery is the reliable way to express "has no matching row": the inner query references the outer `c.id`, and the database only needs to know whether *any* row comes back. Hence `SELECT 1`. The tempting alternative, `customer_id NOT IN (SELECT customer_id …)`, is a landmine: if that subquery yields even one NULL, `NOT IN` evaluates to NULL for every row and you get an empty result with no error.',
  }),

  sqlProblem({
    slug: 'sql-union-cities',
    title: 'Combine two result sets',
    difficulty: 'medium',
    prompt: md(
      'Produce one deduplicated list of every city that appears in **either** `customers` or `employees`.',
      '',
      "One column: `city`. Row order doesn't matter."
    ),
    solutionSql: 'SELECT city FROM customers UNION SELECT city FROM employees;',
    orderMatters: false,
    solutionSource: ['SELECT city FROM customers', 'UNION', 'SELECT city FROM employees;'],
    hints: [
      'A join is the wrong tool. You want to stack rows, not widen them.',
      '`UNION` stacks two result sets and removes duplicates; `UNION ALL` keeps them.',
    ],
    explanation:
      'Joins add **columns**, set operators add **rows**: reaching for the wrong one is a classic mix-up. `UNION` deduplicates the combined result (which costs a sort), while `UNION ALL` just concatenates and is meaningfully faster when you know there are no overlaps or you want the duplicates. Both sides must have the same number of columns with compatible types; the column names come from the first branch.',
  }),

  sqlProblem({
    slug: 'sql-conditional-aggregate',
    title: 'Pivot with conditional aggregation',
    difficulty: 'medium',
    prompt: md(
      'For each genre, count how many order items belong to **completed** orders and how many to **cancelled** ones, as two columns on one row.',
      '',
      "Columns: `genre`, `completed`, `cancelled`. Row order doesn't matter."
    ),
    solutionSql:
      "SELECT b.genre, SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed, SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id GROUP BY b.genre;",
    orderMatters: false,
    solutionSource: [
      'SELECT b.genre,',
      "       SUM(CASE WHEN o.status = 'completed' THEN 1 ELSE 0 END) AS completed,",
      "       SUM(CASE WHEN o.status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled",
      'FROM order_items oi',
      'JOIN books b  ON b.id = oi.book_id',
      'JOIN orders o ON o.id = oi.order_id',
      'GROUP BY b.genre;',
    ],
    hints: [
      'Two separate queries would give two result sets. You need one row per genre.',
      'Put the condition *inside* the aggregate rather than in WHERE.',
      "`SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)`",
    ],
    explanation:
      'Putting a `CASE` **inside** an aggregate is how you pivot rows into columns without a special PIVOT syntax. Each aggregate sees every row of the group but only counts the ones it cares about. A `WHERE` filter cannot do this, because it would remove rows the *other* column still needs. `COUNT(CASE WHEN … THEN 1 END)` works too, since `COUNT` ignores the NULLs from the missing `ELSE`.',
  }),

  sqlProblem({
    slug: 'sql-revenue-by-genre',
    title: 'Revenue by genre',
    difficulty: 'hard',
    prompt: md(
      'Compute total revenue per genre across **completed** orders only, highest revenue first.',
      '',
      'Revenue = `quantity × unit_price`. Columns: `genre`, `revenue`. **Row order matters here.**'
    ),
    solutionSql:
      "SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY b.genre ORDER BY revenue DESC;",
    orderMatters: true,
    solutionSource: [
      'SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue',
      'FROM order_items oi',
      'JOIN books b  ON b.id = oi.book_id',
      'JOIN orders o ON o.id = oi.order_id',
      "WHERE o.status = 'completed'",
      'GROUP BY b.genre',
      'ORDER BY revenue DESC;',
    ],
    hints: [
      'You need three tables: order_items, books, orders.',
      'Aggregate with SUM(quantity * unit_price), grouped by genre.',
      "Don't forget to exclude cancelled orders with WHERE.",
    ],
    explanation:
      'The line item is the grain of the calculation, so `order_items` drives the query: join to `books` for the genre and to `orders` for the status. Because both joins are inner joins here, a `WHERE` filter on `orders.status` is safe. There are no NULL-padded rows to protect. The row-level expression `quantity * unit_price` is computed *before* the aggregate, so `SUM(quantity * unit_price)` is right while `SUM(quantity) * SUM(unit_price)` is very wrong. Cancelled orders in this dataset are large enough to change both the totals and their ordering, which is exactly why the filter matters.',
  }),

  sqlProblem({
    slug: 'sql-window-rank',
    title: 'Rank within a group',
    difficulty: 'hard',
    prompt: md(
      'For each genre, find the **single highest-rated book** (by average review rating). Books with no reviews are excluded.',
      '',
      "Columns: `genre`, `title`. Row order doesn't matter."
    ),
    solutionSql:
      'WITH rated AS (SELECT b.genre, b.title, AVG(r.rating) AS avg_rating FROM books b JOIN reviews r ON r.book_id = b.id GROUP BY b.id, b.genre, b.title), ranked AS (SELECT genre, title, ROW_NUMBER() OVER (PARTITION BY genre ORDER BY avg_rating DESC) AS rn FROM rated) SELECT genre, title FROM ranked WHERE rn = 1;',
    orderMatters: false,
    solutionSource: [
      'WITH rated AS (',
      '  SELECT b.genre, b.title, AVG(r.rating) AS avg_rating',
      '  FROM books b',
      '  JOIN reviews r ON r.book_id = b.id',
      '  GROUP BY b.id, b.genre, b.title',
      '),',
      'ranked AS (',
      '  SELECT genre, title,',
      '         ROW_NUMBER() OVER (PARTITION BY genre ORDER BY avg_rating DESC) AS rn',
      '  FROM rated',
      ')',
      'SELECT genre, title FROM ranked WHERE rn = 1;',
    ],
    hints: [
      'Aggregate first to get one average per book, then rank those.',
      '`ROW_NUMBER() OVER (PARTITION BY genre ORDER BY avg_rating DESC)` numbers rows restarting at 1 per genre.',
      'You cannot filter on a window function directly. Wrap it in a CTE or subquery and filter `rn = 1` outside.',
    ],
    explanation:
      '**Top-N-per-group** is the hard SQL pattern most worth having at your fingertips, and the window-function answer is the one to know. `PARTITION BY` restarts the numbering for each genre while `ORDER BY` decides what counts as first. Window functions are evaluated *after* `WHERE` and `GROUP BY`, so you cannot filter on `rn` in the same query level. That is why the ranking goes in a CTE and the filter goes outside. Use `RANK()` instead of `ROW_NUMBER()` when ties should all win; `ROW_NUMBER()` picks an arbitrary one.',
  }),

  sqlProblem({
    slug: 'sql-running-total',
    title: 'Running total over time',
    difficulty: 'hard',
    prompt: md(
      'Show completed revenue per month **and** the cumulative revenue up to and including that month, oldest first.',
      '',
      'Columns: `month`, `revenue`, `running_total`. **Row order matters here.**'
    ),
    solutionSql:
      "WITH monthly AS (SELECT strftime('%Y-%m', o.ordered_at) AS month, SUM(oi.quantity * oi.unit_price) AS revenue FROM orders o JOIN order_items oi ON oi.order_id = o.id WHERE o.status = 'completed' GROUP BY month) SELECT month, revenue, SUM(revenue) OVER (ORDER BY month) AS running_total FROM monthly ORDER BY month;",
    orderMatters: true,
    solutionSource: [
      'WITH monthly AS (',
      "  SELECT strftime('%Y-%m', o.ordered_at) AS month,",
      '         SUM(oi.quantity * oi.unit_price) AS revenue',
      '  FROM orders o',
      '  JOIN order_items oi ON oi.order_id = o.id',
      "  WHERE o.status = 'completed'",
      '  GROUP BY month',
      ')',
      'SELECT month, revenue,',
      '       SUM(revenue) OVER (ORDER BY month) AS running_total',
      'FROM monthly',
      'ORDER BY month;',
    ],
    hints: [
      'Two steps: collapse to one row per month, then accumulate across those rows.',
      'A window function can aggregate *without* collapsing rows.',
      '`SUM(revenue) OVER (ORDER BY month)` defaults to "all rows from the start up to this one".',
    ],
    explanation:
      'An aggregate with `OVER (…)` computes across a window of rows while **keeping every row**, which is exactly what a running total needs. With an `ORDER BY` and no explicit frame, the default window is `RANGE BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW`: everything from the start of the partition through the current row. Omit the `ORDER BY` and you get the grand total on every row instead, which is a useful trick for "percentage of total" columns.',
  }),

  sqlProblem({
    slug: 'sql-cte-first-order',
    title: "Each customer's first order",
    difficulty: 'hard',
    prompt: md(
      'For every customer who has completed at least one order, show the date of their **first** completed order.',
      '',
      "Columns: `name`, `first_order`. Row order doesn't matter."
    ),
    solutionSql:
      "WITH firsts AS (SELECT customer_id, MIN(ordered_at) AS first_order FROM orders WHERE status = 'completed' GROUP BY customer_id) SELECT c.name, f.first_order FROM firsts f JOIN customers c ON c.id = f.customer_id;",
    orderMatters: false,
    solutionSource: [
      'WITH firsts AS (',
      '  SELECT customer_id, MIN(ordered_at) AS first_order',
      '  FROM orders',
      "  WHERE status = 'completed'",
      '  GROUP BY customer_id',
      ')',
      'SELECT c.name, f.first_order',
      'FROM firsts f',
      'JOIN customers c ON c.id = f.customer_id;',
    ],
    hints: [
      'Aggregate the orders down to one row per customer first.',
      '`MIN(ordered_at)` on ISO date text gives the earliest date.',
      'A CTE (`WITH … AS (…)`) lets you name that intermediate result and join to it.',
    ],
    explanation:
      "A **CTE** names an intermediate result so the final query reads like the sentence you would say out loud. Aggregate first, then decorate with names. `MIN` works directly on `YYYY-MM-DD` text because ISO-8601 sorts lexicographically in chronological order, which is the entire reason to store dates that way. Note that `MIN(ordered_at)` gives the earliest *date* but not the rest of that order's row; if you needed the order id too, you would rank with `ROW_NUMBER()` instead.",
  }),

  sqlProblem({
    slug: 'sql-percent-of-total',
    title: 'Share of total',
    difficulty: 'hard',
    prompt: md(
      'What share of completed revenue does each genre represent? Show the genre, its revenue, and its percentage of the overall total rounded to 1 decimal place. Largest share first.',
      '',
      'Columns: `genre`, `revenue`, `pct`. **Row order matters here.**'
    ),
    solutionSql:
      "WITH per_genre AS (SELECT b.genre AS genre, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY b.genre) SELECT genre, revenue, ROUND(revenue * 100.0 / SUM(revenue) OVER (), 1) AS pct FROM per_genre ORDER BY revenue DESC;",
    orderMatters: true,
    solutionSource: [
      'WITH per_genre AS (',
      '  SELECT b.genre AS genre,',
      '         SUM(oi.quantity * oi.unit_price) AS revenue',
      '  FROM order_items oi',
      '  JOIN books b  ON b.id = oi.book_id',
      '  JOIN orders o ON o.id = oi.order_id',
      "  WHERE o.status = 'completed'",
      '  GROUP BY b.genre',
      ')',
      'SELECT genre, revenue,',
      '       ROUND(revenue * 100.0 / SUM(revenue) OVER (), 1) AS pct',
      'FROM per_genre',
      'ORDER BY revenue DESC;',
    ],
    hints: [
      'You need each row to see the grand total across all rows.',
      'A window function with an empty `OVER ()` aggregates over every row of the result.',
      '`revenue * 100.0 / SUM(revenue) OVER ()`, wrapped in `ROUND(…, 1)`.',
    ],
    explanation:
      '`SUM(x) OVER ()`, an empty window, computes the grand total and attaches it to **every** row, which is the neat way to express "share of total" without a self-join or a second query. Multiplying by `100.0` rather than `100` forces floating-point division; with two integers many databases would do integer division and hand you 0. `ROUND(…, 1)` then trims the presentation noise.',
  }),

  sqlProblem({
    slug: 'sql-recursive-hierarchy',
    title: 'Walk a hierarchy (recursive CTE)',
    difficulty: 'hard',
    prompt: md(
      'List every employee together with their **depth** in the org chart: the CEO is depth 0, their direct reports are depth 1, and so on.',
      '',
      "Columns: `name`, `depth`. Row order doesn't matter."
    ),
    solutionSql:
      'WITH RECURSIVE chart AS (SELECT id, name, 0 AS depth FROM employees WHERE manager_id IS NULL UNION ALL SELECT e.id, e.name, chart.depth + 1 FROM employees e JOIN chart ON e.manager_id = chart.id) SELECT name, depth FROM chart;',
    orderMatters: false,
    solutionSource: [
      'WITH RECURSIVE chart AS (',
      '  -- anchor: everyone with no manager',
      '  SELECT id, name, 0 AS depth',
      '  FROM employees',
      '  WHERE manager_id IS NULL',
      '  UNION ALL',
      '  -- recursive step: anyone reporting to a row we already have',
      '  SELECT e.id, e.name, chart.depth + 1',
      '  FROM employees e',
      '  JOIN chart ON e.manager_id = chart.id',
      ')',
      'SELECT name, depth FROM chart;',
    ],
    hints: [
      'A self-join only reaches one level down. You need to repeat it until nothing new appears.',
      '`WITH RECURSIVE name AS (anchor UNION ALL recursive-step)`.',
      'The anchor is the CEO (`manager_id IS NULL`); the step joins employees back onto the CTE itself.',
    ],
    explanation:
      'A **recursive CTE** has two halves joined by `UNION ALL`: an anchor that seeds the result, and a step that references the CTE by name and runs repeatedly until it produces no new rows. Carrying `depth + 1` through the step is how you measure distance from the root. This is the tool for org charts, category trees, threaded comments and graph traversal. Anything where a plain join cannot know how deep to go. Guard against cycles in real data, or the recursion never terminates.',
  }),

  sqlProblem({
    slug: 'sql-dedupe-keep-latest',
    title: 'Keep only the latest row per key',
    difficulty: 'hard',
    prompt: md(
      'For every book that has been reviewed, return only its **most recent** review: the book title, the rating and the review date.',
      '',
      "No book in the data has two reviews on the same day. Columns: `title`, `rating`, `created_at`. Row order doesn't matter."
    ),
    solutionSql:
      'WITH ranked AS (SELECT book_id, rating, created_at, ROW_NUMBER() OVER (PARTITION BY book_id ORDER BY created_at DESC) AS rn FROM reviews) SELECT b.title, r.rating, r.created_at FROM ranked r JOIN books b ON b.id = r.book_id WHERE r.rn = 1;',
    orderMatters: false,
    solutionSource: [
      'WITH ranked AS (',
      '  SELECT book_id, rating, created_at,',
      '         ROW_NUMBER() OVER (PARTITION BY book_id ORDER BY created_at DESC) AS rn',
      '  FROM reviews',
      ')',
      'SELECT b.title, r.rating, r.created_at',
      'FROM ranked r',
      'JOIN books b ON b.id = r.book_id',
      'WHERE r.rn = 1;',
    ],
    hints: [
      '`MAX(created_at)` gives you the date but loses the rating from that same row.',
      'Number the reviews per book, newest first, then keep number 1.',
      '`ROW_NUMBER() OVER (PARTITION BY book_id ORDER BY created_at DESC)`',
    ],
    explanation:
      'The instinctive `GROUP BY book_id, MAX(created_at)` answers "when" but cannot tell you the rating **from that row**: other columns are not carried along by an aggregate, and databases that let you select them anyway return an arbitrary row. Ranking with `ROW_NUMBER()` and filtering `rn = 1` keeps the whole winning row intact. This "latest record per key" query shows up constantly: current price per product, latest status per ticket, most recent login per user.',
  }),
];
