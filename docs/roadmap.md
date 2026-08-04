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

## 3. The systems case-study shelf

Curated further reading rather than pages, specified for the systems section and never built. It
blocks nothing, which is why it has outlasted every page that used to sit above it here.

## 4. The workout queue

Ordered by what the library cannot practise today. `graphql`, `react-window` and `zustand` are in
`packages/workouts/package.json` and are imported by no workout on disk, so three rows below are
what that batch was bought for and nothing else is waiting on it; `ws`, Hono and Zod are absent, and
adding one is a decision rather than a reflex.

**"Runs on infrastructure that already exists" was overstated, and two rows leaned on it.** PGlite
and testing-library are real dependencies, but the fake Redis, the driven clock and the fixture API
are each one workout's own file: `materialise` copies `scaffold/` and then that workout's `files/`,
so the next workout copies and adapts them rather than importing them. Two consequences the rows
below now carry. The fixture API injects a per-query delay and not a fault, which is not what a
retry exercise needs. And `scaffold/vitest.config.ts` is the only config a workspace has, because
`files/` lands under `src/`, so a workout cannot set `TZ` or anything else for its own suites.

| Workout                        | Stack                              | Shape    | Pairs with     | The lesson                                                                                                                                                                |
| ------------------------------ | ---------------------------------- | -------- | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Two clients in sync            | WebSocket (`ws`) + React           | feature  | moving data    | The direction a one-way stream cannot go: the client writes too, and two of them have to converge. Reconnect and replay are `live-dashboard-sse`, so this is not that     |
| Retry with backoff             | Node + a downstream that fails     | feature  | server runtime | Timeouts, jittered backoff, a retry budget, and giving up honestly. Nothing on disk injects a fault yet, so the failing dependency is part of the work                    |
| Cache the expensive report     | Express + fake Redis               | feature  | caching        | Cache-aside around a route: the key derived from the request, and the invalidation on write. The dedupe is `one-recompute-not-fifty`. Needs a brief that is not a report  |
| Context re-render bug-hunt     | React                              | bug-hunt | React          | One context redrawing consumers that do not read the part that changed; the split is the fix. Not a typing lag in a filtered list: see the note below                     |
| The form says nothing is wrong | React                              | bug-hunt | the browser    | Errors nobody is told about: association, `aria-live`, and focus to the first failure. The only queued row that gives the browser section's a11y pages a workout          |
| Cursor pagination bug-hunt     | **not Kysely**                     | bug-hunt | databases      | Offset pagination drifting under writes; keyset as the fix. One connection is enough to show it, so the stack is free: see the note below                                 |
| Job queue consumer             | Node + in-repo fake queue          | feature  | moving data    | The ack, and what a redelivery costs when it lands after the work rather than before. Dedupe on a key is `idempotent-payments-express`                                    |
| Timezone-correct booking       | Node + fixed clock, pinned `TZ`    | bug-hunt | dates          | Store UTC, render local, survive the DST boundary. A fixed clock does not fix the zone, and the suite has to pin it: see the note below                                   |
| Optimistic UI that rolls back  | React                              | feature  | React          | Apply now, reconcile later, roll back on failure without discarding edits made in the meantime                                                                            |
| Sessions, not just tokens      | Nest + SQLite (Express is 7 of 16) | feature  | APIs           | Revocation is the thing a stateless JWT cannot do; rotate, revoke, and prove it takes effect. Opens where `jwt-auth-express` closes, and gives security its first workout |
| The audit row that lied        | SQLite + transactions              | bug-hunt | databases      | The state change and its audit row must land together or not at all; the checkpoint interrupts it                                                                         |
| GraphQL N+1 bug-hunt           | GraphQL + Drizzle, not orders      | bug-hunt | moving data    | The client picks the query shape, so batching per request is the fix rather than a better join. A join is the third telling of an N+1 the library already owns twice      |
| Windowed list                  | React + react-window               | feature  | React          | What windowing breaks: keyboard and focus surviving a recycled row, and the row whose height is not fixed. "No jank" on its own is `react-list-windowing`                 |
| TypeORM relations bug-hunt     | TypeORM + SQLite, not the report   | bug-hunt | server runtime | `save` against `update`, and the nested-where trap. The write side, because `orders-report-typeorm` already owns the read side                                            |
| Validated request boundary     | Zod, Hono optional                 | feature  | APIs           | Schema validation as the API's front door: query-string coercion, what the 400 says, and the handler typed from the schema. Gives typescript its first workout            |

**All eighteen rows have now been audited against what is on disk.** Eight failed on their stated
terms, three are cut outright, and the rest are narrowed in the lesson column above. The cause is
structural rather than careless: a row is written before the workouts it will sit beside, so its
stack and its brief age into a collision nobody chose. Re-read a row against
`packages/workouts/content/` before starting it.

Three rows are cut, and the argument is here rather than in git history:

- **The migration that locks up** cannot be checkpointed on the engine it names. PGlite serves one
  in-process connection, and the Kysely dialect holds a single `DatabaseConnection` whose
  `releaseConnection` does nothing, so there is no second session for a long lock to block. What is
  left is reading the DDL back and asserting on its shape, which is a checklist rather than
  behaviour, and the lesson is the blocking. A database in the workout set that serves two
  connections would reverse it, and nothing else wants one.
- **Accessible data table** is a rep and a citation, not twenty minutes.
  `records-sorting-drizzle` already builds the sortable, paginated table with the header toggle and
  a visible indicator, so this row adds `scope`, `caption` and `aria-sort` on top of somebody else's
  work, and `html-table-caption-scope` is already a rep. Its keyboard half is
  `autocomplete-react`'s fourth checkpoint. A grid where the a11y is the hard part rather than the
  last attribute, with a roving tabindex and an interactive cell, would be a different row, and it
  has no page yet.
- **Search that ignores accents** was already the product-search brief a second time, on the same
  Drizzle and PGlite as `product-search-drizzle`. The earlier audit left two exits open, and the
  other one has stood empty since: no domain has presented itself where the accents are the bug
  rather than a property of the search. `databases/search-past-like.md` and the five `sql-search-*`
  reps own the territory, so this is a section on that page. A uniqueness constraint that lets José
  and Jose both register is a real bug and a different brief, and would reverse it.

Four rows failed on their stack or their brief rather than their lesson:

- **Retry with backoff** specified React and pairs with server runtime, which is the tell: timeouts,
  a retry budget and retry amplification are all server-side, and the row's stated justification is
  wrong anyway. The only fixture API on disk belongs to `autocomplete-react` and injects a per-query
  delay, not a fault. On the client it would also be that workout's stack and its race conditions
  again. `server-runtime/failure-and-retries.md` has six reps and no workout, which is the argument
  for the row; `circuit-breaker-node` counts failures across calls and leaves the per-call retry
  untouched, which is the argument for the lesson.
- **Cache the expensive report** would be the third report. `conditional-requests-express` polls
  `GET /report`, `one-recompute-not-fifty` builds a dashboard report that takes four seconds, and
  `orders-report-typeorm` is an orders report. Caching already has three workouts across five pages,
  so this row is not buying a section its first one. Cache-aside around a route is genuinely
  untaught, and the invalidation on write is the half no rep covers. Move it to something written
  rather than read.
- **Cursor pagination** would be the second Kysely-and-PGlite bug-hunt over an orders list, and
  `slow-list-endpoint-kysely` already has pagination in its focus. It parks keyset in its own "if you
  finish early", so offset drift is genuinely untaught, and the lesson stands. The stack does not:
  breadth is a goal in itself, and this is the same tool on the same table. One thing the earlier
  audit did not say is that the stack is completely free, because the drift needs no real
  concurrency: an insert interleaved between two page fetches shows the skipped row on one
  connection, so raw better-sqlite3 with no ORM at all would do.
- **TypeORM relations** overlaps `orders-report-typeorm` on relations loading, which is the read form
  of the same trap and is what that workout's first checkpoint is about. Its `save`-against-`update`
  half and the nested-where trap are untouched, so the row survives narrowed to the write side. It
  must not be the orders report again, since that is the file the read-side workout hands you.

Four more are narrowed against a workout already on disk, and the lesson column says how:

- **Two clients in sync** claims "reconnect, buffering, offset-and-replay for missed events", and
  that is `live-dashboard-sse` checkpoints two and four, down to the capped buffer and the replay
  from a last-seen id. That brief opens by saying it does not need a WebSocket, and parks the
  over-the-buffer case in its own "if you finish early". `moving-data/websockets.md` has four reps
  and no workout, so the row is worth keeping for the half SSE cannot reach: a second writer, and
  what happens when both of them write.
- **Context re-render** is the right lesson on the wrong symptom.
  `react/context-and-rerender-scope.md` has four reps and no workout, so the gap is real, but
  `invoice-panel-react`'s third complaint is already "the list is a character behind what I have
  typed" and its third checkpoint already counts renders through React's `Profiler`. Same symptom,
  same instrument, same filtered list. The mechanism differs, so change what the user reports.
- **Job queue consumer** says the consumer must be idempotent, which is
  `idempotent-payments-express` checkpoints two and three in a different envelope: record the claim
  before doing the work and let the key settle the race. `moving-data/queues-and-background-jobs.md`
  has five reps and no workout. What the HTTP boundary does not have is the ack, so that is the
  workout: acking after the work rather than before, and where a message that will never succeed
  goes. If the answer is "store the message id and skip it", the row has been written already.
- **Timezone-correct booking** hits the trap section 1 records for modules, one layer down.
  Assertions run in the reader's zone, and a fixed clock moves `now` without touching `TZ`. A workout
  cannot fix this from `files/`, because `materialise` copies those into `src/` and the scaffold's
  `vitest.config.ts` is the only config in the workspace, so the suites have to pin the zone
  themselves. The alternative, assertions that hold in every zone, deletes the DST boundary that is
  the whole lesson.

**Four sections have pages and no workout, and only two of them want one.** `security` gets its
first from "Sessions, not just tokens" and `typescript` gets its first from the Zod row, which is
worth more than the "first Hono workout" that row used to claim. The other two want a citation
rather than a row: `json-parser` is cited by no page at all and is pure JavaScript, which closes the
`javascript` hole from both sides at once, and the `sql` pages teach writing SELECTs, which is what
forty-six `sql-*` reps are already for. The nearest workout shape there is
`orders-report-typeorm`'s third checkpoint, and a link from `sql/grouping.md` is the honest answer.

The build-your-own genre has spent its condition. `json-parser`, `circuit-breaker-node` and
`one-recompute-not-fifty` have all landed, and the evidence they landed well is thin: the first is
cited by no page and the other two by one each. A wire-protocol Redis clone or a tiny message broker
waits on citing what is there, not on a fourth one.

## 5. Sections with no practice behind them yet

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
