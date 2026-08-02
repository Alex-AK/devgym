# Roadmap

What is not built. A row leaves this file the day it ships, and nothing here is ever marked done or
struck through: a queue that keeps its own history stops reading as a queue.

Ordered by what a reader is missing while working, not by which section is least complete. The
target is practical knowledge for web engineering and AI engineering, judged against a 15-minute
morning session, and content is never picked to complete a set. Why something was deferred lives in
[decisions.md](./decisions.md); how to write any of it lives in [content.md](./content.md).

## 1. The AI engineering handbook section

The reps exist and the pages do not, which makes this the largest gap against the stated target.
The `ai-engineering` category is in the queue, so nothing here is blocked any more: the pages have
reps to point `practise` at.

Pages: what inference actually costs you (tokens, latency, and why the p99 is a different animal
when the dependency is generative); streaming a model response, whose transport half the moving-data
section already owns; embeddings and vector search (what a nearest-neighbour lookup does and does
not promise); retrieval, honestly (the plumbing, the chunking, and why the retrieval step is usually
the bug); MCP servers (what the protocol specifies, and why a tool boundary is an API design problem
you have solved before); evals as tests.

**Credits: the Model Context Protocol specification, the provider API docs, and open papers where a
claim needs one.** All of them are load-bearing rather than decorative here, because none of this
material can be checked by running it against `practice.db` the way the SQL pages were. Whoever
writes these needs the sources open in front of them; a session that cannot reach
`modelcontextprotocol.io`, the provider docs and `arxiv.org` cannot honestly date a `verified` line
and should write something else instead.

This section is not machine learning. Training, model architectures and the statistics under them
are out of scope and stay out.

## 2. The JavaScript pages its reps already need

Three pages, each with problems in the queue today and nothing explaining them. The cheapest work in
this file and the most immediately felt. Section credits stand: Dan Abramov's _Just JavaScript_.

| Page               | The model it carries                                                                                          | Reps waiting on it                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `javascript/prototypes.md` | Reads walk the chain and writes do not, `this` is decided at the call site, and `{}` is not empty | `debug-prototype-shadow`, `debug-this-callback`, `code-count-by`, `code-group-by-key` |
| `javascript/numbers.md` | Doubles are binary, integers are exact to 2^53, money goes in minor units, `parseInt` and `Number` disagree about junk | `debug-float-precision`, `debug-number-money`, `debug-parseint-radix` |
| `javascript/closures.md` | What a closure captures, and why the captured value goes stale | `js-closure-var` |

Prototypes has the strongest case in the repo: four problems, one model, and four different wrong
answers that all come from the same misreading. Numbers is not on the curriculum map at all; it was
earned by an audit that read the problems instead of the section titles.

## 3. Data structures and the cost of a choice

Around fifteen problems across `coding`, `js-apis` and `debugging` are about choosing a structure or
getting a comparator right, and no page names any of it. Not an algorithms course: every page
answers what the choice costs at the size you actually have.

Pages: array, object, `Map`, `Set` (lookup, insertion, iteration order, and what a key can be); what
O notation is for, and the constant factors that beat it under a few thousand items; the structures
behind the ones you use (hash tables, and why a bad key function is the whole story); sorting, and
the comparator bugs that survive review; trees and the shapes real systems use them for (the B-tree
the databases section already assumes); when the right answer is a database rather than a data
structure. Credits: MDN, the V8 blog, open algorithms references.

The patterns themselves stay in `dsa-patterns` below. Choosing a structure is not a pattern; it is a
decision ordinary feature work makes hourly and usually by reflex.

## 4. Modules

A fourth content type, specified in full and not started. It is the first since workouts that needs
application code rather than a directory, and it settles twenty problems that the handbook was never
the right home for: `query-params` and `dates` have ten each, cited by nothing.

One sitting with one API, 15 to 25 minutes, ordered steps, and every step is predict, run, correct.
[content.md](./content.md) holds the shape on disk, the tagged fences and the authoring rules.

The application cost, which is the whole of it:

1. `packages/modules` with the loader, validator and `modules.spec.ts`, mirroring
   `packages/handbook`. The first three steps of `js-date` are the fixture, and the spec is the
   proof. No UI, no endpoints.
2. A `modules` Nest module: list, get, and one run endpoint handing `{ code, assertions }` to the
   existing `grading/code-runner.ts`. The runner does not change.
3. The step view on the web, reusing `CodeEditor` and `Markdown`.

No schema change and no progress tracking in v1, for the reason handbook pages get none: the
problems are the progress tracking, and a module's `practise` list is how it reaches your queue.

Then content, in this order.

| Module                 | The wrong model it corrects                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| `js-date`              | That a `Date` is a date. It is an instant, months count from zero, parsing is a trap |
| `url-and-searchparams` | That a query string is a string you can build by hand                                |
| `promises`             | That `await` in a loop and `Promise.all` differ only in style                        |
| `json`                 | That `JSON.stringify` round-trips your object                                        |
| `js-errors`            | That `catch` catches what you think, and that a thrown thing is an `Error`           |
| `regex`                | That a pattern that works is a pattern that terminates                               |
| `tokens-and-crypto`    | That a signed token is an encrypted one, and that comparing strings is safe          |
| `node-fs`              | That reading a file is one call and writing one is atomic. Weakest of the eight here |

`js-date` is the format's real test: if the shape survives timezones it survives anything.
`tokens-and-crypto` is the one module where a wrong model is a vulnerability rather than a bug, so
it stays on `node:crypto` and `jose` and invents no primitives of its own.

## 5. Pages missing from sections that already ship

Each of these is named on the curriculum map and absent from `packages/handbook/content/`. Ordered
by how often the gap is met in ordinary work, not by section.

| Section        | Page                                | Note                                                                                       |
| -------------- | ----------------------------------- | ------------------------------------------------------------------------------------------ |
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

## 6. The rest of the problem queue

| Category         | Roughly | What it is                                                                                                                                                   |
| ---------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `sql-performance` | 15      | Read the plan, name the fix. Captured EXPLAIN output graded as short-text and explain, plus live `sql` rewrites: EXISTS against COUNT, filter before joining, keyset pagination |
| `api-design`     | 12      | Offset against cursor, idempotency keys and check-store-replay, versioning, rate limit algorithms and what to key on, status codes past the basics            |
| `node`           | 12      | The runtime itself: event loop ordering past what js-apis covers, streams and backpressure, buffers, process against worker threads, what blocks              |
| `dsa-patterns`   | 30      | Two pointers, sliding window, fast and slow pointers, prefix sum, monotonic stack, top-K with a heap, binary search variants, intervals, BFS and DFS, backtracking, basic DP. Two or three js-code problems per pattern, added in pattern-sized waves |

`sql-performance` stores each captured plan with the query and dataset that produced it, so a plan
can be regenerated when engines update instead of rotting as a string.

**`dsa-patterns` stays out of the daily queue** and is entered on purpose, through focused practice
or its own session preset. That needs the one application change in this file: the session builder
treats every category equally today, so categories need an opt-out flag it respects. Small, but it
is code rather than content.

## 7. The workout queue

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
| Cursor pagination bug-hunt  | Kysely + PGlite           | bug-hunt | databases      | Offset pagination drifting under concurrent writes; keyset as the fix, plan asserted via EXPLAIN  |
| Job queue consumer          | Node + in-repo fake queue | feature  | moving data    | At-least-once delivery means the consumer must be idempotent; the duplicate delivery is the test  |
| Timezone-correct booking    | Node + fixed clock        | bug-hunt | dates          | Store UTC, render local, and survive the DST boundary the fixture lands on                        |
| Streaming a big export      | Express + React           | feature  | moving data    | A CSV that must not buffer; the checkpoint measures peak buffered bytes, not wall-clock time      |
| Optimistic UI that rolls back | React                   | feature  | React          | Apply now, reconcile later, roll back on failure without discarding edits made in the meantime    |
| Sessions, not just tokens   | Express + SQLite          | feature  | APIs           | Revocation is the thing a stateless JWT cannot do; rotate, revoke, and prove it takes effect      |
| The audit row that lied     | SQLite + transactions     | bug-hunt | databases      | The state change and its audit row must land together or not at all; the checkpoint interrupts it |
| The migration that locks up | PGlite                    | feature  | databases      | Add a NOT NULL column to a large table without holding a long lock; backfill in batches           |
| GraphQL N+1 bug-hunt        | GraphQL + Drizzle         | bug-hunt | moving data    | The round trip GraphQL saves the client, paid for on the server one resolver at a time            |
| Accessible data table       | React                     | feature  | the browser    | A sortable table a screen reader can use: `scope`, `aria-sort`, caption, and keyboard ordering    |
| Search that ignores accents | Drizzle + PGlite          | bug-hunt | databases      | Normalisation and collation: "cafe" has to find "café", and the index has to survive the fix      |
| Windowed list               | React + react-window      | feature  | React          | 10,000 rows without jank                                                                          |
| TypeORM relations bug-hunt  | TypeORM + SQLite          | bug-hunt | server runtime | `save` against `update`, relations loading, and the nested-where trap                             |
| Validated request boundary  | Hono + Zod                | feature  | APIs           | Two birds: the first Hono workout, and schema validation as the API's front door                  |

The build-your-own genre grows further (a wire-protocol Redis clone, a tiny message broker) only if
`json-parser`, `circuit-breaker-node` and `one-recompute-not-fifty` land well, and only then is it
worth deciding whether multi-part series need real support.

## 8. Sections with no practice behind them yet

Both of these are last because nothing in the problem set is waiting on them.

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

- **Run a single checkpoint** while iterating, instead of the whole suite.
- **Diff against the reference** rather than a side-by-side reveal, so the review after the timer is
  a comparison rather than a read.
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
