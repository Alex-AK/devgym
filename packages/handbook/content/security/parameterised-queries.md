---
title: Parameterised queries, and what an ORM promises
question: Every value in this query is bound, so why is the ORDER BY still injectable?
order: 2
practise:
  - security-sql-injection
sources:
  - author: OWASP
    title: SQL Injection Prevention Cheat Sheet
    url: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html
  - author: PostgreSQL
    title: 'Frontend/Backend Protocol: Message Flow'
    url: https://www.postgresql.org/docs/current/protocol-flow.html
  - author: PostgreSQL
    title: PREPARE
    url: https://www.postgresql.org/docs/current/sql-prepare.html
  - author: SQLite
    title: SQL Language Expressions
    url: https://www.sqlite.org/lang_expr.html
  - author: MySQL
    title: mysql_real_escape_string()
    url: https://dev.mysql.com/doc/c-api/8.4/en/mysql-real-escape-string.html
  - author: Drizzle ORM
    title: Magic sql operator
    url: https://orm.drizzle.team/docs/sql
  - author: Drizzle ORM
    title: Drizzle ORM has SQL injection via improperly escaped SQL identifiers
    url: https://github.com/drizzle-team/drizzle-orm/security/advisories/GHSA-gpj5-g38j-94v9
  - author: Prisma
    title: Raw queries
    url: https://www.prisma.io/docs/orm/prisma-client/using-raw-sql/raw-queries
  - author: Knex
    title: Raw
    url: https://knexjs.org/guide/raw.html
  - author: PortSwigger
    title: SQL injection
    url: https://portswigger.net/web-security/sql-injection
verified: 2026-08-02
---

The general shape of injection, untrusted input reaching something that parses it, is
[the previous page](./untrusted-input-becomes-code.md)'s subject. This page is about the one defence
that works against it in SQL, and about the line in your query that the defence does not cover.

## The model

A parameterised query is not a string with the dangerous characters taken out. It is a statement and
a set of values sent as separate things, and the order they arrive in is the whole defence.

Postgres makes the split visible on the wire. In the extended query protocol the frontend "first
sends a Parse message, which contains a textual query string, optionally some information about data
types of parameter placeholders, and the name of a destination prepared-statement object". A Bind
message follows, which "gives the name of the source prepared statement ..., the name of the
destination portal ..., and the values to use for any parameter placeholders present in the prepared
statement". The docs give the reason for the whole arrangement in one clause: "the possibility of
supplying data values as separate parameters instead of having to insert them directly into a query
string".

The server parses at Parse, and at that moment it has not seen a value. By the time values arrive
at Bind the shape of the statement is settled, so a value has nowhere to go except the slot it was
bound to. `PREPARE` describes the same split from SQL: "the specified statement is parsed,
analyzed, and rewritten" when the prepare runs, and planning and execution happen later. OWASP
states the consequence flatly: "the database will always distinguish between code and data,
regardless of what user input is supplied."

SQLite has no wire and reaches the same place through its C API. A parameter token "specifies a
placeholder in the expression for a value that is filled in at runtime using the sqlite3_bind()
family of C/C++ interfaces". The placeholder is part of the parsed expression; the value is attached
to that parsed statement afterwards.

Placeholder spelling is per-engine, and it is not only cosmetic. SQLite takes five forms: `?`,
`?NNN` where "a question mark followed by a number NNN holds a spot for the NNN-th parameter", and
the named forms `:AAAA`, `@AAAA` and `$AAAA`. Postgres takes one, and `PREPARE` says to "refer to
parameters by position, using `$1`, `$2`, etc." So a leading `$` introduces a named parameter in
SQLite and a positional one in Postgres.

### Escaping is this idea, implemented by hand

OWASP files escaping under a heading that is also its verdict: "Defense Option 4: STRONGLY
DISCOURAGED: Escaping All User-Supplied Input". The reason given is that "this methodology is
fragile compared to other defenses, and we CANNOT guarantee that this option will prevent all SQL
injections in all situations." Three concrete ways it breaks:

**Character set.** MySQL's `mysql_real_escape_string()` needs "a valid, open connection because
character escaping depends on the character set in use by the server". Change the connection's
charset with `SET NAMES` and the escaper never learns: `mysql_set_character_set()` "works like SET
NAMES but also affects the character set used by mysql_real_escape_string(), which SET NAMES does
not". The function then escapes for one encoding while the server reads another.

**Dialect.** The same function "fails and produces an CR_INSECURE_API_ERR error if the
NO_BACKSLASH_ESCAPES SQL mode is enabled", and the stated reason is the sentence worth keeping: "the
function cannot escape quote characters except by doubling them, and to do this properly, it must
know more information about the quoting context than is available." An escaper is a function over a
string that does not know where in the statement that string will land. The parser does know, which
is the only real difference between the two approaches.

**No quotes to break out of.** `WHERE id = ${id}` puts the value in a numeric context, so escaping
quote characters defends nothing: `1 OR 1=1` contains no quote. Same missing context, more obvious.

### What you cannot parameterise

This is the part that survives an ORM. A placeholder is a value slot in a statement that has
already been parsed, so anything that changes the parse cannot be one. OWASP names the set: "If you
are faced with parts of SQL queries that can't use bind variables, such as table names, column
names, or sort order indicators (ASC or DESC), input validation or query redesign is the most
appropriate defense." Prisma says it about its own API in one line: "Variables cannot be used for
identifiers such as column names, table names or database names, or for SQL keywords."

The fix is a map, not a check. OWASP: "developers should map the parameter values to the
legal/expected table or column names to make sure unvalidated user input doesn't end up in the
query." The difference is load-bearing. A regex like `^[a-z_]+$` is a check, and it admits every
column that exists plus every one that ever will. An object whose keys are the sort options and
whose values are columns you typed is a map, and input that is not a key has no route into the
statement at all.

## Worked example

The endpoint from the paired problem, with the value bound. `?` is SQLite's placeholder; the same
query against Postgres reads `$1`:

```js
db.prepare('SELECT id, email FROM users WHERE email = ?').all(email);
```

Now the request grows a sort, and the value binding does nothing for it:

```js
const sort = req.query.sort; // 'email'
const dir = req.query.dir; // 'asc'

db.prepare(`SELECT id, email FROM users WHERE email = ? ORDER BY ${sort} ${dir}`).all(email);
// ?sort=id&dir=DESC%2C(SELECT%20…) and the ORDER BY clause is now yours
```

The allowlist version, in Drizzle. Both the column and the direction resolve to values written in
this file:

```ts
const SORTABLE = { email: users.email, createdAt: users.createdAt };

const column = SORTABLE[req.query.sort ?? 'createdAt'];
if (!column) throw new BadRequestException('unknown sort column');

const rows = await db
  .select()
  .from(users)
  .where(eq(users.email, email)) // bound
  .orderBy(req.query.dir === 'asc' ? asc(column) : desc(column)); // chosen, not interpolated
```

Nothing from the request is concatenated. The request picks between options; it never supplies one.

### The escape hatches, by name

Every query builder has a door out, and the door is where this bug still ships.

- **Drizzle.** The `sql` template binds: "any dynamic parameters such as `${id}` will be mapped to
  the $1 placeholder, and the corresponding values will be moved to an array of values that are
  passed separately to the database." `sql.raw()` does not, by design, "for cases where you may not
  need to create parameterized values from input or map tables/columns to escaped ones", and it
  "allows you to include raw SQL statements within your queries without any additional processing
  or escaping".
- **Prisma.** `$queryRaw` takes a tagged template and "Prisma Client creates prepared statements
  that are safe from SQL injections". `$queryRawUnsafe` takes a plain string, and the docs are
  explicit: "If you use this method with user inputs ..., then you open up the possibility for SQL
  injection attacks."
- **Knex.** `whereRaw` and friends take bindings, with two kinds: "Positional bindings `?` are
  interpreted as values and `??` are interpreted as identifiers", and "Named bindings such as
  `:name` are interpreted as values and `:name:` interpreted as identifiers." The identifier forms
  quote what you pass. They do not check that it is a column you meant.

## Traps

**The sort order is controlled by the query string, and every value in the statement is bound.**
Placeholders cover value positions only, so the column name and `ASC`/`DESC` were interpolated even
though `email` was not. Map the request to columns and directions you wrote, and reject anything
that is not a key.

**Reaching for `sql.raw` to interpolate one table name took the parameterisation with it.**
`sql.raw()` receives a string, so JavaScript has already finished every `${}` inside it before
Drizzle sees anything. There is no template left to bind. Keep the raw fragment down to the
identifier and build the rest with `sql`, or drop the raw call and select the table from an object.

**The identifier was escaped by the library and it was still injectable.** Drizzle's
`sql.identifier()` "wrapped the identifier but did not escape the quote delimiter inside the
identifier value", so `"` was not doubled to `""` on Postgres, SQLite and Gel, and the backtick was
not doubled on MySQL and SingleStore. That is CVE-2026-39356, affecting drizzle-orm at or below
0.45.1 and 1.0.0-beta.19, and fixed in 0.45.2 and 1.0.0-beta.20. The advisory's own example is
dynamic sorting from `req.query.sort`. An escaping function is code that can be wrong; an allowlist
has no parser to get wrong.

**A saved filter that worked for months dropped a table the day someone ran a report.** Second-order
injection, which "occurs when the application takes user input from an HTTP request and stores it
for future use" and then reads it back into a query unsafely. Binding on the way in makes the write
safe and says nothing about the read. Data out of your own database is untrusted input like any
other.

**The bindings went to the wrong columns after a clause was moved.** In SQLite an anonymous `?`
"creates a parameter with a number one greater than the largest parameter number already assigned",
so mixing `?` and `?NNN` in one statement hands out numbers you did not choose, and reordering the
SQL reorders the values. Use one style per statement, and prefer the named forms (`:email`) when a
statement has more than two or three parameters.

**Every query is parameterised and a user can still read another tenant's rows.** Binding decides
whether a value can become syntax. It has no opinion about which rows this account may see, and
neither does the ORM. OWASP's remaining database-side control is deliberately coarse: "you should
minimize the privileges assigned to every database account in your environment", and "DO NOT ASSIGN
DBA OR ADMIN TYPE ACCESS TO YOUR APPLICATION ACCOUNTS." That is an account-level grant, and it
cannot express which customer owns which row. The `WHERE tenant_id = ?` is yours to write and yours
to test.
