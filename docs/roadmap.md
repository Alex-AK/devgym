# Roadmap

What is not built. A row leaves this file the day it ships, and nothing here is ever marked done or
struck through: a queue that keeps its own history stops reading as a queue.

Ordered by what a reader is missing while working, not by which section is least complete. The
target is practical knowledge for web engineering and AI engineering, judged against a 15-minute
morning session, and content is never picked to complete a set. Why something was deferred lives in
[decisions.md](./decisions.md); how to write any of it lives in [content.md](./content.md).

## 1. The rest of the modules

The format ships and two are written, so everything here is content: a directory, no application
code. Six left, and none of them arrives with the argument `url-and-searchparams` had. Ten
`query-params` reps cited by nothing was a gap somebody would notice while working; what is below is
a list of APIs, and the note recorded under `promises` in [decisions.md](./decisions.md) is evidence
against writing it rather than for. Pick the next one when a rep or a page asks for it.

| Module              | The wrong model it corrects                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `promises`          | That `await` in a loop and `Promise.all` differ only in style                        |
| `json`              | That `JSON.stringify` round-trips your object                                        |
| `js-errors`         | That `catch` catches what you think, and that a thrown thing is an `Error`           |
| `regex`             | That a pattern that works is a pattern that terminates                               |
| `tokens-and-crypto` | That a signed token is an encrypted one, and that comparing strings is safe          |
| `node-fs`           | That reading a file is one call and writing one is atomic. Weakest of the six here   |

`tokens-and-crypto` is the one module where a wrong model is a vulnerability rather than a bug, so it
stays on `node:crypto` and `jose` and invents no primitives of its own.

**Two things `js-date` proved that the next author should not rediscover.** Assertions run on the
reader's machine with no fake clock and no fixed timezone, so anything that depends on the host zone
is a broken module for everybody except its author: `js-date`'s assertions were checked in five zones
before it shipped. And a step's assertions are about the API rather than about the reader's edit, so
they keep holding when the snippet is changed, which is what makes the editor safe to play in.

## 2. The rest of the decks

Two decks suggest themselves and cannot be written, both for the same reason: `page` is mandatory and
neither has one. No page owns the redirect codes, 301 against 302 against 307 against 308. Time
formats are a module rather than a page, because there was no model there to write down. A deck is
not on its own a reason to write a page, so both wait until something else asks for one.

Everything else the contrast sets wanted is written. `packages/decks/content/` is the inventory, and
a deck named there and not on disk is a name that changed, not a deck that is missing.

## 3. Pages missing from sections that already ship

Each of these is named on the curriculum map and absent from `packages/handbook/content/`. Ordered
by how often the gap is met in ordinary work, not by section.

| Section        | Page                                | Note                                                                                       |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
| javascript     | Boolean operators, and what they return | `equality.md` owns comparison. Nothing owns `&&`/`\|\|`/`??` returning an operand rather than a boolean, or inverting a compound condition |
| databases      | Transactions and ACID               | A prerequisite the systems section already assumes                                          |
| server-runtime | Middleware, and the order it runs in | The life-of-a-request page covers this in Nest's vocabulary and never says `next()`         |
| databases      | Query refactorings that matter      | EXISTS against COUNT, OR into UNION, unpicking correlated subqueries                        |
| databases      | Partial and expression indexes      | The third leg of the index material, after composite indexes and column order               |
| moving-data    | Delivery guarantees over a socket   | What reconnection loses, client and server buffering, acks, and offset-and-replay           |
| headers        | Conditional requests and ranges     | 304, 206, resumable downloads                                                               |
| server-runtime | Three frameworks, one request       | Express, Nest and FastAPI on the same route. No Python runs; it is a comparison             |
| moving-data    | SOAP, and why you are meeting it    | Written for the integration you inherit, not the service you build                          |
| moving-data    | tRPC                                | The one transport from the v2 table still worth a page; see decisions.md for the other two  |

Systems also owes the case-study shelf specified for it: curated further reading rather than pages,
so it blocks nothing.

## 4. The rest of the problem queue

| Category         | Roughly | What it is                                                                                                                                                   |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sql-performance` | 15      | Read the plan, name the fix. Captured EXPLAIN output graded as short-text and explain, plus live `sql` rewrites: EXISTS against COUNT, filter before joining, keyset pagination |
| `api-design`     | 12      | Offset against cursor, idempotency keys and check-store-replay, versioning, rate limit algorithms and what to key on, status codes past the basics            |
| `node`           | 12      | The runtime itself: event loop ordering past what js-apis covers, streams and backpressure, buffers, process against worker threads, what blocks              |
| `dsa-patterns`   | 30      | Two pointers, sliding window, fast and slow pointers, prefix sum, monotonic stack, top-K with a heap, binary search variants, intervals, BFS and DFS, backtracking, basic DP. Two or three js-code problems per pattern, added in pattern-sized waves |
| `logic`          | 12      | Boolean algebra where it actually bites: what `&&`, `||` and `??` return (operands, not booleans), short-circuit evaluation and the side effect that therefore never runs, inverting a compound condition without getting it backwards, precedence, and SQL's three-valued logic where `NOT IN` against a set containing `NULL` returns nothing at all. Truth tables stay in as the model behind a conditional; gates as circuits stay out, because this is not a hardware course |

`sql-performance` stores each captured plan with the query and dataset that produced it, so a plan
can be regenerated when engines update instead of rotting as a string.

**`dsa-patterns` stays out of the daily queue** and is entered on purpose, which is the one
application change left in this file. Tags now cut across categories and the queue, the session
builder and focused practice all respect them, but a tag is opt-in and this is opt-out: the queue
still deals every category equally, so a category needs a flag that takes it out of the round robin
while leaving it reachable on purpose. The seam is the filter chain in `queue()`, next to the tag
one. Small, but it is code rather than content.

## 5. The workout queue

Ordered by what the library cannot practise today. Everything here runs on infrastructure that
already exists (PGlite, the fake Redis and its clock, the fixture API, testing-library) except where
a dependency is named. `graphql`, `react-window` and `zustand` are already in
`packages/workouts/package.json`; `ws` and Hono with Zod are not.

| Workout                     | Stack                     | Shape    | Pairs with     | The lesson                                                                                        |
| --------------------------- | ------------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------- |
| Two clients in sync         | WebSocket (`ws`) + React  | feature  | moving data    | The delivery-guarantees page made real: reconnect, buffering, offset-and-replay for missed events |
| Retry with backoff          | React + fixture API       | feature  | server runtime | Timeouts, jittered backoff, giving up honestly; fault injection already exists in the fixture     |
| Cache the expensive report  | Express + fake Redis      | feature  | caching        | Cache-aside in a real handler. The dedupe itself is already `one-recompute-not-fifty`; this is where it goes wrong around a route |
| Context re-render bug-hunt  | React                     | bug-hunt | React          | A typing lag caused by one fat context; checkpoints count renders, the split is the fix           |
| The form that loses your work | React                   | bug-hunt | the browser    | Errors nobody is told about: association, focus to the first failure, and the double submit       |
| Cursor pagination bug-hunt  | **not Kysely**            | bug-hunt | databases      | Offset pagination drifting under concurrent writes; keyset as the fix. Needs a stack that is not a second orders-list bug-hunt: see the note below |
| Job queue consumer          | Node + in-repo fake queue | feature  | moving data    | At-least-once delivery means the consumer must be idempotent; the duplicate delivery is the test  |
| Timezone-correct booking    | Node + fixed clock        | bug-hunt | dates          | Store UTC, render local, and survive the DST boundary the fixture lands on                        |
| Streaming a big export      | Express + React           | feature  | moving data    | A CSV that must not buffer; the checkpoint measures peak buffered bytes, not wall-clock time      |
| Optimistic UI that rolls back | React                   | feature  | React          | Apply now, reconcile later, roll back on failure without discarding edits made in the meantime    |
| Sessions, not just tokens   | Express + SQLite          | feature  | APIs           | Revocation is the thing a stateless JWT cannot do; rotate, revoke, and prove it takes effect      |
| The audit row that lied     | SQLite + transactions     | bug-hunt | databases      | The state change and its audit row must land together or not at all; the checkpoint interrupts it |
| The migration that locks up | PGlite                    | feature  | databases      | Add a NOT NULL column to a large table without holding a long lock; backfill in batches           |
| GraphQL N+1 bug-hunt        | GraphQL + Drizzle         | bug-hunt | moving data    | The round trip GraphQL saves the client, paid for on the server one resolver at a time            |
| Accessible data table       | React                     | feature  | the browser    | A sortable table a screen reader can use: `scope`, `aria-sort`, caption, and keyboard ordering    |
| Search that ignores accents | **undecided**             | bug-hunt | databases      | Normalisation and collation: "cafe" has to find "café", and the index has to survive the fix. Weakest row here, and the note below says why |
| Windowed list               | React + react-window      | feature  | React          | 10,000 rows without jank                                                                          |
| TypeORM relations bug-hunt  | TypeORM + SQLite          | bug-hunt | server runtime | `save` against `update`, and the nested-where trap. The write side, because `orders-report-typeorm` already owns the read side |
| Validated request boundary  | Hono + Zod                | feature  | APIs           | Two birds: the first Hono workout, and schema validation as the API's front door                  |

**Three of these rows were audited against what is already on disk, and none of them was written on
its stated terms.** The lesson each claims is real and uncovered; what collided was the stack and the
brief, which the row could not see because it was written before the workouts it now sits beside.

- **Cursor pagination** would be the second Kysely-and-PGlite bug-hunt over an orders list, and
  `slow-list-endpoint-kysely` already has pagination in its focus. It parks keyset in its own "if you
  finish early", so offset drift under concurrent writes is genuinely untaught, and the lesson stands.
  The stack does not: breadth is a goal in itself, and this is the same tool on the same table. Give
  it a stack the library does not have twice already.
- **Search that ignores accents** is the product-search brief a second time, on the same Drizzle and
  PGlite as `product-search-drizzle`, which owns matching, case, literal wildcards and the total.
  Accents and collation are absent from that workout and near-absent from
  `databases/search-past-like.md`, which mentions normalisation once in a trap. But
  [decisions.md](./decisions.md) already cut a row for being this brief a third time, and the same
  argument applies at the second. Move it off product search, or make it a rep and a section on the
  page instead.
- **TypeORM relations** overlaps `orders-report-typeorm` on relations loading, which is the read form
  of the same trap and is what that workout's first checkpoint is about. Its `save`-against-`update`
  half and the nested-where trap are untouched, so the row survives narrowed to the write side, and
  the lesson column above now says so.

The build-your-own genre grows further (a wire-protocol Redis clone, a tiny message broker) only if
`json-parser`, `circuit-breaker-node` and `one-recompute-not-fifty` land well, and only then is it
worth deciding whether multi-part series need real support.

## 6. Sections with no practice behind them yet

These are last because nothing in the problem set is waiting on them.

**Isolation: sandboxes, containers and virtual machines.** What actually contains code you do not
trust, and what only looks like it does. This project is its own worked example, which is the reason
the section is worth writing rather than reading elsewhere: the workout runner executes submitted
code, [decisions.md](./decisions.md) records `node:vm` as an isolation convenience and not a security
boundary, and self-hosting was declined on exactly that ground. Pages: what a process already gives
you and what it does not; what a container is made of, which is namespaces and cgroups over a kernel
everything still shares; where a virtual machine draws the line instead, and what that costs; microVMs,
and why the people running other people's code ended up there; and running code a model wrote, which
is the case a web engineer now actually meets. That last one is a gap inside a section that already
ships, since the AI engineering pages cover the code around a generative dependency and say nothing
about executing its output. Distinct from production below, which owns the image as a packaging and
deploy concern: this section owns isolation as a security property. Credits: the Docker and Firecracker
docs, the Linux man pages, `node:vm`'s own documented warning.

**Unix, at the level a web engineer meets it.** Not a shell course and not systems administration:
the handful of operating-system facts that decide how a Node process behaves once it is not on your
laptop. Pages: your server is a process, with an environment, a working directory, a parent and a set
of file descriptors; standard output and standard error are two streams, which is why logs go to
stdout and why a progress bar does not; signals, and the `SIGTERM` a platform sends before it stops
waiting, which is the whole of graceful shutdown; exit codes, including what a non-zero one does
inside a pipeline; permissions and ownership, and why the container does not run as root; and the
path, environment and quoting rules that make a command behave one way in CI and another on a laptop.
The overlap with production is signals, and the split is that production owns the deploy sequence
while this section owns what the signal is. Credits: the Linux man pages, the POSIX specification,
Node's `process` documentation.

**Running it in production.** Each page answers what changes about your code when it stops being a
process on your laptop, which is the part a web engineer owns rather than a cloud certification.
Pages: what a deploy actually is (artefact, config, and the swap); processes, containers and what
the image is really doing; configuration and secrets, and where the environment stops being enough;
health, readiness and the difference; logs, metrics and traces, and the cardinality trap;
zero-downtime releases and the migration that has to go first. Credits: the Twelve-Factor App, the
Docker and Kubernetes docs, OpenTelemetry.

**Trade-offs and architecture**, last of all, because it resists the page shape: trade-off thinking
is learned in retrospectives, not reference pages. Four pages that can fill a traps section
honestly: monolith, modules, services (when each is the right call); migrating without stopping
(strangler fig, and holding the line with ratchet tooling); prudent against reckless technical debt;
and the dependency behind a port you own, with Redis as the worked example, since the workouts
already ship a fake one with a clock. The architecture reading list becomes this section's
further-reading shelf, every book credited. Credits: refactoring.guru, Microsoft's strangler-fig
page, Will Larson's migrations essay, the listed books.

## Platform

Content is the product, so this stays short. All of it is workout depth.

- **Attempt history per workout**: second and third runs are the point, so the UI should show the
  trend in time-to-green.
- **Multi-file tree** rather than a flat tab list, once a workout exceeds about five files.
- **`pnpm workout <slug>`** to scaffold a workout directory, mirroring `pnpm grade`. Worth doing
  once enough workouts exist to show what actually varies.

## Deferred

Listed so they are decisions rather than oversights. The arguments live in
[decisions.md](./decisions.md).

- **A testing handbook section**, until the category grows past the JavaScript section's size or a
  workout's checkpoints are about the tests themselves.
- **Mongo and Mongoose**, which need a real server or a heavyweight memory-server dependency.
- **A FastAPI workout**, which would put a Python runtime in the workout runner.
- **React Native and desktop**, until the web map is substantially built.
- **Interactive diagrams**, which are application code per diagram.
- **A weekly long-session preset**, superseded by the essentials path, which has shipped. The preset
  was a longer daily queue; a curated order is the better answer, and it does not wait on whether
  workouts fit a morning, because it is explicitly not a morning session.
- **Progress tracking on modules**, including whether a failed prediction should schedule a review.
  That is a migration, and it waits for real data.
- **A schedule on cards**, which is the same migration and a weaker signal, since a self-graded card
  produces an opinion rather than a verdict. Revisit after a few weeks of using a deck, when you can
  either name the cards you keep missing or are annoyed that the app cannot.
