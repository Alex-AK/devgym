# devgym — PRD v2: the practice platform

> **Status: in progress.** Phase 0 and phase 1 have landed, and phase 2 is underway. Everything
> below phase 2 is planned, not built. [PRD.md](./PRD.md) is the historical v1 spec; this is the
> live one. The three `PRD-v3-*.md` documents extend it: the
> [learning guide](./PRD-v3-learning-guide.md) grows phase 4 into a full curriculum, the
> [content roadmap](./PRD-v3-content-roadmap.md) extends phase 2's queue, and
> [open-sourcing](./PRD-v3-open-source.md) adds the about page and citation policy.

## Why a v2

v1 is a queue of short problems: type an answer, get graded, build a streak. It is good at recall and
bad at everything that recall is not. Real work, and the project-based live coding it is practice
for, means sitting inside an unfamiliar codebase and making it do something new in twenty minutes.

v2 adds that, and keeps the queue exactly as it is. Two modes, one app:

- **Problems** — 225 short problems, 15-minute morning reps. Recall and recognition. Built, and
  growing continuously.
- **Workouts** — 15-30 minute builds against a real toolchain: read a brief, edit real files in a
  real project, run checkpoints, see how far you got. Built, and the library is filling up.
- **Handbook** — short foundational reference for frontend, backend, database and infrastructure.
  Planned, and specified in phase 4 below.

Framing note: this is **practice**, not interview prep. Interviews are one thing the practice is
good for. The vocabulary in the UI and the content stays "workout", "checkpoint", "run" — never
"candidate", "grade", "score".

**Content is the product, and it is never finished.** Both the problem set and the workout library
grow indefinitely, and breadth of stack is an explicit goal rather than a consequence: exposure to
tools you have not used is worth as much as depth in the ones you have. That has three standing
implications, which is why it is stated here rather than left as a habit.

- Adding content must stay cheap. A problem is an entry in a seed file; a workout is a directory.
  Anything that makes either of those require application changes is a bug in the design.
- The safety net is what makes volume safe. Every canonical answer grades correct, every workout
  solution passes and every starter fails, and that runs in `pnpm verify` rather than by inspection.
- New stacks are additions to one `package.json`, and the finding of what does or does not fit is
  worth writing down. Prisma did not fit, and why is recorded in phase 2.

---

## 1. Workouts

### 1.1 The shape

A workout is a **directory, not code**. Adding one touches no application source:

```
packages/workouts/
  package.json                   the dependency set every workspace resolves against
  scaffold/                      vitest.config.ts + package.json, copied into each workspace
  content/<slug>/
    workout.json                 manifest: stack, minutes, checkpoints, editable files
    brief.md                     the task, written like a ticket
    files/                       the starting project — what you edit
    tests/checkpoints/*.test.ts  one suite per checkpoint, hidden from the editor
    solution/                    reference implementation for the editable files
```

`workout.json` declares the stack as free text (`{ server, orm, database, client }`) so the same
task can ship against Drizzle, Prisma, TypeORM and Kysely as four separate workouts. That is the
point: practising against a stack you do not know is the thing that pays off.

### 1.2 Execution model

Server-side, real toolchain. The alternative — a browser sandbox — cannot run a real ORM, which
defeats the purpose.

```
browser                          server
┌───────────┐                    ┌──────────────────────────────┐
│ file tabs │  POST /files       │ <data>/workouts/<attemptId>/ │
│ CodeMirror│ ─────────────────► │   src/    (editable)         │
│ [Run]     │                    │   tests/  (read-only)        │
│ checkpoints│ ◄──────────────── │   node_modules -> symlink    │
└───────────┘  WorkoutRun        │ spawn vitest --reporter=json │
                                 └──────────────────────────────┘
```

The symlink is the load-bearing trick: `<workspace>/node_modules` points at
`packages/workouts/node_modules`, which pnpm has already built from that package's dependencies. A
workout therefore imports the real `drizzle-orm` and the real `@testing-library/react` with no
install per attempt and no network.

Adding a stack = adding a dependency to `packages/workouts/package.json`.

### 1.3 Checkpoints

Each checkpoint is one test file. Status is "did every assertion in that file pass". This is what
makes a 20-minute exercise honest: at ten minutes you can see two of four green, and an unfinished
run still tells you something. Checkpoints are ordered and carry a hint shown only after a failure.

### 1.4 What is built

- `packages/workouts/` with the scaffold and the workouts. The scaffold's vitest config picks a test
  environment by extension, so a `.test.tsx` checkpoint gets a DOM and a `.test.ts` one does not. It
  does that with two projects rather than `environmentMatchGlobs`, which vitest deprecated in 3.2.
- `apps/server/src/workouts/` — content loading and manifest validation, workspace materialisation
  with path-escape guards, the vitest runner and its JSON mapping, Nest module.
- `workout_attempts` table: one attempt at a time per workout, best-checkpoint history, last run
  persisted so a reload does not lose the panel.
- `apps/web/src/pages/WorkoutsPage.tsx`, `WorkoutPage.tsx` — list, brief, multi-file editor with
  per-file reset, count-up timer, checkpoint panel with failure output, reference reveal.
- `workouts.spec.ts` — the content safety net: every solution passes every checkpoint, every starter
  fails at least one. Runs in the normal `pnpm verify`.

**Workout 1: `records-sorting-drizzle`** (20 min, Drizzle + SQLite + React). Add sorting to a
paginated employee list. Checkpoints: the handler accepts sort/dir; the ordering happens in SQL
rather than after pagination; an unknown column is rejected rather than interpolated; the client
toggles direction and returns to page 1.

**Workout 2: `jwt-auth-express`** (20 min, Express + jose). Issue a token on login and gate a route
behind it. Checkpoints: login returns a token signed with the app secret, carrying the user id and
an expiry; bad credentials get 401 with no token and answer identically whether or not the address
exists; the protected route refuses a forged, expired, malformed or unknown-subject token with a 401
rather than a 500; and it answers with the token holder, password hash left out.

**Workout 3: `slow-list-endpoint-kysely`** (25 min, Kysely + PGlite). A bug-hunt: the orders list
reads all 40,000 rows, pages them in JavaScript, and fetches the customer name once per row, with no
index to help it. Checkpoints: the page it answers with is unchanged; no statement returns more rows
than the page holds; a page costs the same number of round trips whatever its size; and `EXPLAIN` of
the query actually sent shows an index scan with no sort step.

**Workout 4: `product-search-drizzle`** (20 min, Drizzle + PGlite). Search a catalogue by name or
SKU, case-insensitive and partial, paginated with a total. Checkpoints: partial matches whatever the
case and a blank term meaning the whole catalogue; a SKU-only term finding its product exactly once;
`%` and `_` treated as characters rather than wildcards; and pages that walk the catalogue without
repeating a row. It needed no new dependencies: drizzle ships its own PGlite driver.

The centre of it is the third checkpoint. Parameterising the query defeats injection and does nothing
about `LIKE` syntax, so searching "50%" quietly matches everything containing "50" — a bug that
passes review because the query looks safe.

**Workout 5: `rate-limit-express`** (20 min, Express + a fake Redis). A fixed-window limiter as
middleware. Checkpoints: a client gets through to its allowance with the `RateLimit-*` headers
counting down; past it a 429 with a `Retry-After` and no handler run; the window genuinely turns
over; and one client's spending does not come out of another's budget.

Its third checkpoint is the one that pays. `INCR` on a missing key creates it with no deadline, so a
limiter that forgets `EXPIRE` blocks the client forever, and one that calls `EXPIRE` on every request
keeps pushing the window out so a busy client never gets back in. The checkpoint spends part of an
allowance, advances the fake clock into the window, spends the rest, then advances past where the
window should have closed. Only the correct version is let back in.

**Workout 6: `autocomplete-react`** (25 min, React + a fixture API). The first client-side workout.
The starter searches, shows results and lets you click one, which is fine if every user has a mouse,
a fast connection and their sight. Checkpoints: it waits for the typing to stop; a late answer cannot
overwrite a newer one; arrow keys, Enter and Escape drive the list; and the combobox roles are there
with `aria-activedescendant` naming the highlighted option.

The second checkpoint is a race made deterministic. The fixture API takes a per-query delay, so a
checkpoint can hold the answer to "bra" back until after the answer to "brac" has landed. "bra"
matches two products and "brac" matches one, so whose answer is on screen is a visible fact rather
than a timing guess.

**Workout 7: `orders-report-typeorm`** (25 min, TypeORM + SQLite). A bug-hunt with two bugs stacked:
the report runs two extra queries per order, and the obvious fix — join everything in — trades eighty
round trips for one query that ships every line item to JavaScript to be added up. Checkpoints: the
figures are unchanged; the statement count is the same for five orders and sixty; no query returns
more rows than the report has; and an order with nothing on it still appears, at zero, rather than
being dropped by an inner join.

**Workout 8: `auth-guard-nestjs`** (20 min, NestJS). The ownership check on `GET /reports/:id` was
written when that was the only route. There are four now and three of them are open. Checkpoints:
nobody reads or exports somebody else's report; nobody deletes one, and the refusal happens before
the row is gone; anonymous is 401 and missing is 404, in that order, so a stranger cannot learn which
ids exist; and the check is applied to the controller rather than copied into each handler.

That last checkpoint reads the controller's metadata rather than its behaviour, which is the one
place in the library where that is the right call: four correct copies of the same `if` still leave
the fifth route uncovered, and covering the route nobody has written yet is the entire lesson.

**Decorator metadata, and why the scaffold uses SWC.** Nest and TypeORM both read constructor
parameter types back at runtime through `design:paramtypes`. esbuild does not emit decorator metadata
at all, so dependency injection silently resolves to `undefined` under it — the failure is a
confusing null, not a build error. The scaffold's server project therefore transforms with SWC
(`legacyDecorator` plus `decoratorMetadata`); the client project stays on esbuild, which is faster and
handles JSX without any of it. All six earlier workouts pass unchanged under the switch. This is what
makes any decorator-based stack — Nest, TypeORM, TypeGraphQL, class-validator — available to future
workouts.

The second workout is what proved the format: it added Express, jose and supertest to
`packages/workouts/package.json` and touched no application source at all. The third is what proved
the format can carry a whole database engine.

**Judging perf without a stopwatch.** A timed assertion would be flaky, so the slow-endpoint workout
asserts on what the code asked the database for instead. The PGlite dialect logs every statement and
its row count, and the checkpoint runs `EXPLAIN` on the query the endpoint actually sent. That makes
the failure messages the teaching: "one query came back with 40000 rows for a page of 20", "a page of
20 took 21 round trips". It also distinguishes an index that exists from an index the planner
chooses, which is the distinction the exercise is about. Any workout about performance should be
built this way.

**Two things deliberately not shared yet.** Workouts 3 and 4 each log the statements their ORM runs,
and the shapes differ enough (a hand-written dialect that counts rows against drizzle's own logger
hook) that folding them into one helper at n=2 would be guessing. Anything shared would have to live
in `scaffold/`, since that is the only directory copied into every workspace, and that makes it part
of the authoring contract rather than an implementation detail. Same reasoning for the
`pnpm workout <slug>` generator in phase 3: worth doing once enough workouts exist to show what
actually varies, not before.

---

## 2. Roadmap

### Phase 2 — the workout library

Port the accumulated briefs, then keep going. Each is full stack, because that is the level being
practised. Seven are done: JWT login, the slow list endpoint, search on Drizzle, rate limiting, the
autocomplete, the orders report on TypeORM and the Nest guard.

| Workout                           | Stack                     | Shape   |
| --------------------------------- | ------------------------- | ------- |
| Infinite scroll with retry        | React + local fixture API | feature |
| Drag-and-drop ordering, persisted | React + Zustand + API     | feature |

**Breadth of stack is a goal in itself, not a side effect.** The original list was a set of briefs
that happened to use different tools. It is now the other way round: the library should cover the
ground a working developer actually walks across, and the brief is chosen to suit the stack rather
than the other way round. Two workouts on the same tool are worth less than the same two spread
across tools, even when the second brief is weaker, because the thing being practised is reading an
unfamiliar codebase under time pressure.

What is covered so far, and what is not:

| Area           | Covered                            | Missing                                       |
| -------------- | ---------------------------------- | --------------------------------------------- |
| Query builders | Drizzle, Kysely, TypeORM           | Sequelize, Mongoose, raw SQL                  |
| Databases      | SQLite, Postgres (PGlite)          | Mongo, Redis as a store rather than a counter |
| HTTP servers   | Express, NestJS                    | Fastify, Hono, plain `node:http`              |
| Client         | React                              | state libraries, forms, tables, routing       |
| Transport      | request/response JSON              | SSE, WebSockets, file upload, streaming       |
| Cross-cutting  | auth, rate limiting, N+1, indexing | caching, retries, background jobs, uploads    |

The transport row is the widest gap and the one the handbook work below feeds directly: a workout
that streams results over SSE and one that keeps two clients in sync over a WebSocket would cover a
kind of code the library has none of.

**Prisma is off the list.** The plan was the same search brief on a second ORM, which is exactly the
"practise against a stack you do not know" case. It does not fit: Prisma generates its client with
`prisma generate`, which is a build step in a package that deliberately has none, and there is no
PGlite driver adapter for it, so it would also need one written against Prisma's adapter API rather
than the thirty lines Kysely needed. Both are solvable and neither is worth it for one workout. If a
second ORM is wanted, TypeORM and Sequelize both connect without codegen.

Three adaptations the offline constraint forces, all of which improve the exercise:

- **jsonplaceholder → a local fixture endpoint** with the same response shape, plus fault injection
  so "handle failures and allow retry" is actually testable. Done, in workout 6, as a module the
  component imports rather than a stubbed `fetch`: it records every call with its signal and takes a
  per-query delay, which is what turns a race into something a checkpoint can assert on. It also
  rejects with a real `AbortError` when the signal fires, so handling that properly is part of the
  exercise. Client checkpoints use real timers throughout — vitest's fake ones fight `userEvent`, and
  a fixture with its own latency knob is both simpler and closer to the real failure.
- **Redis → a small in-repo fake** with the real `ioredis` surface (`incr`, `expire`, `ttl`), so the
  code written is real Redis code. Done, in workout 5. Keeping the awkward semantics is what makes it
  worth using: `incr` creating a key with no deadline is the whole lesson, and `ttl` answering -1 for
  "no deadline" against -2 for "no key" is the kind of thing you only learn by needing it. The fake
  also carries an `advanceTime` that real Redis has not, so a checkpoint can wait out a sixty-second
  window for free. Anything time-based should get a fake clock rather than vitest's timers, which
  fight supertest's sockets.
- **Postgres → PGlite**, a WASM Postgres running in-process. Real `ILIKE`, real `EXPLAIN`, no server.
  This is also what makes a genuine query-optimisation workout possible. Done, in workout 3: it ships
  its own 25MB of WASM, boots in about a second and seeds 40,000 rows in well under one, so a
  checkpoint suite can afford a fresh database per file. Kysely needs a small hand-written dialect to
  talk to it, which lives in the workout's read-only files.

### Phase 3 — workout depth

- **Multi-file tree**, not a flat tab list, once a workout exceeds ~5 files.
- **Diff against the reference** rather than a side-by-side reveal, so the review step after the
  timer is a comparison rather than a read.
- **Run a single checkpoint** while iterating, instead of the whole suite.
- **Attempt history per workout**: second and third runs at the same workout are the point, so the
  UI should show the trend in time-to-green.
- **`pnpm workout <slug>`** — scaffold a new workout directory from a template, mirroring
  `pnpm grade`.

### Phase 4 — the handbook

Short foundational reference, deliberately not exhaustive. Each page is one concept, a worked
example, and a link to the problems and workouts that exercise it. The `relevance` axis already
carries the right signal: a `foundational` problem is a handbook page waiting to be written.

#### What a page is

A page is not an article. It is the thing you would want open beside you while doing the workout, and
it has a fixed shape:

1. **The question it answers**, in one sentence, phrased the way you would ask it at the moment you
   needed it. "Why did my cache not invalidate" beats "Cache invalidation".
2. **The mental model** — a paragraph and, where it earns its place, one diagram. What is actually
   happening, not the API surface.
3. **A worked example** you can read in under a minute. Real code, and where possible lifted straight
   out of a workout so the two reinforce each other.
4. **The traps** — the two or three things that are actually got wrong, stated as symptoms first,
   because that is how you meet them.
5. **Where to practise it** — links to the problems and workouts that exercise it. This is what stops
   the handbook becoming a wiki nobody opens.

A page that cannot fill section 4 honestly is a page nobody needed.

#### 4a. Moving data between machines

The largest gap in both the problem set and the workout library, and the section to build first. The
organising idea is not a list of protocols but the four questions that pick one:

- **Who starts it?** The client, the server, or a schedule.
- **How many messages, and in which direction?** One-shot, one-to-many, or a genuine conversation.
- **What has to be true about delivery?** Order, exactly-once, durability if nobody is listening.
- **What does it cost?** Connections held open, infrastructure that has to be sticky, what breaks
  behind a corporate proxy.

Pages, each answering those four for one option:

| Page                       | The thing it is actually for                                                                                                                     |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Request/response over HTTP | The default. Why it is the default, and what it cannot do                                                                                        |
| HTTP/1.1 vs 2 vs 3         | Head-of-line blocking, multiplexing, why "bundle everything" advice expired                                                                      |
| REST in practice           | Resources, verbs, status codes, and where the purity argument stops paying                                                                       |
| GraphQL                    | One round trip for a screen's worth of data, and the N+1 it invites on the server                                                                |
| tRPC                       | Types across the wire without codegen, and what you give up (it is not an API for anyone else)                                                   |
| gRPC                       | Binary, schema-first, service-to-service; why it is rare in the browser                                                                          |
| Long polling               | The fallback that still underpins a lot of "realtime"                                                                                            |
| Server-Sent Events         | Server pushes, one direction, plain HTTP, automatic reconnect. The one people skip past to WebSockets and should not                             |
| WebSockets                 | A real two-way conversation, and everything that gets harder: auth, scaling, reconnect, backpressure                                             |
| WebRTC                     | Peer to peer, media and data, and why there is still a server (signalling, STUN, TURN)                                                           |
| Webhooks                   | Somebody else's server starting the conversation; retries, replay, signature verification                                                        |
| Queues and background jobs | Deliberately not answering now; at-least-once, idempotency, dead letters                                                                         |
| Batch and ETL              | Bulk movement on a schedule. A different axis from everything above, and the honest answer to a surprising number of "we need realtime" requests |

The last two are not transports in the same sense, and that is the point of including them: a good
share of the time the right answer to "how should these systems talk" is "they should not, in real
time".

**A decision page** ties it together: a table of the above against the four questions, plus the three
cases worth memorising — a dashboard that updates (SSE), a chat or a collaborative editor
(WebSockets), a file that has to move (HTTP, and then a queue for what happens next).

#### 4b. Headers

Headers are where a surprising amount of production behaviour actually lives, and they are almost
never taught directly.

- **The model** — request and response metadata, case-insensitive, and what a proxy is allowed to do
  to them on the way through.
- **Content negotiation** — `Accept`, `Content-Type`, `Content-Encoding`, and why the server picking
  wrong is usually a `Vary` problem.
- **Authentication** — `Authorization`, bearer tokens, cookies, and why `Set-Cookie` behaves unlike
  every other header.
- **Caching** — `Cache-Control`, `ETag`, `If-None-Match`, `Last-Modified`, `Age`, `Vary`. Shares a
  page with 4c.
- **CORS** — preflight, `Origin`, `Access-Control-Allow-*`, credentials, and why "it works in curl"
  proves nothing.
- **Security** — `Content-Security-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`,
  `Referrer-Policy`. What each actually stops.
- **Proxies and identity** — `X-Forwarded-For`, `Forwarded`, why trusting it blindly is a rate limiter
  that anyone can bypass. This connects straight to workout 5.
- **Conditional requests and ranges** — 304, 206, resumable downloads.

#### 4c. Caching, client and server

The user asked for the basics across stacks, and the basics are less about any one cache than about
knowing how many of them a single response passes through. The spine page is a diagram of exactly
that: browser memory, browser disk, service worker, CDN, reverse proxy, application, ORM, database
buffer pool. A stale value is always one of those, and naming which one is most of the fix.

**Client**

- The browser HTTP cache, and the difference between a reload, a hard reload and a fresh visit.
- `Cache-Control` from the consumer's side: `no-store` vs `no-cache` vs `max-age=0`, which are three
  different things and are used interchangeably by people who have not read this page.
- Application caches — React Query, SWR, Apollo. Staleness, revalidation, and why they mostly
  reimplement HTTP caching in JavaScript.
- Local storage as a cache, and why it usually should not be.
- Service workers and offline, briefly.

**Server**

- Reverse proxy and CDN caching; cache keys, and how a careless `Vary: Cookie` reduces the hit rate to
  nothing.
- Application-level memoisation, and its lifetime problem the moment there are two processes.
- Redis or memcached as a shared cache: TTL against event-driven invalidation, and the cache
  stampede when a popular key expires.
- What the database caches on your behalf — the buffer pool, prepared statements, and why "the second
  run is always faster" makes benchmarks lie. This one connects to workout 3.

**The hard parts**, which get their own page because they are the same three every time: choosing a
key, invalidating without a list of everything that depends on the value, and deciding whether stale
is worse than slow. `stale-while-revalidate` is the answer often enough to be worth knowing by name.

#### 4d. The rest

Roughly in build order, after the three above:

- **What happens on a request**, DNS to response. The spine everything else hangs from.
- **Auth vs authz**, sessions vs tokens, where the check belongs. Two workouts already point here.
- **How an index actually gets used**, and why the planner sometimes refuses one. Workout 3 is the
  practical half.
- **N+1, and how to see it** — the query log, not the stopwatch.
- **The event loop**, and what "blocking" means in a runtime with one thread.
- **Failure and retries** — timeouts, backoff, jitter, idempotency keys, at-least-once. Pairs with the
  queues page in 4a.
- **Load balancers and what they change** — sticky sessions, health checks, and why in-process state
  stops working the day there are two instances.
- **Where state lives on the client** — URL, server cache, component. Deciding this correctly removes
  most state-management arguments.

#### How it connects to the rest of the app

Two links, both cheap and both the reason to build it at all:

- Every handbook page lists the problems and workouts that exercise it, drawn from the existing
  `relevance` and `focus` fields rather than a hand-maintained list.
- Every workout brief links back to the pages behind it, so the review after the timer has somewhere
  to go. A workout you failed is the best possible moment to read the page.

Candidate first pages, from the study list: how an index actually gets used, what happens on a
request from DNS to response, the event loop, N+1 and how to see it, auth vs authz, caching layers,
what a load balancer changes.

### Phase 5 — the parts that are not executable

System design and behavioural questions do not fit checkpoints. Options, in preference order:

1. A written-answer workout type graded on keyword groups, reusing the existing `explain` grader.
2. A self-review rubric: answer, then reveal a model answer and grade yourself against a checklist.
3. Leave them in the handbook as reading with prompts.

---

## 3. Constraints that still hold

Everything in the v1 hard constraints carries forward, with one addition:

- **Fully offline at runtime.** No workout may reach the network. Fixtures and WASM databases, never
  a live API. This is a content review rule as much as a code one.
- **The workspace is not a security boundary.** It runs the user's own code on the user's own
  machine, like any dev server. Path-escape guards exist to catch mistakes, not attackers. Do not
  expose devgym on a network interface.
- **Workspaces are disposable.** `<data>/workouts/<attemptId>/` is deleted when an attempt finishes.
  Anything worth keeping goes in the database.

## 4. Open questions

- **Does a 20-minute workout actually fit a morning?** The queue is 15 minutes by design. Workouts
  may be a weekend thing, which would change how the dashboard presents them.
- **How much scaffolding is too much?** The current workout hands over a working paginated list. A
  harder variant starts from an empty file. Both are valid; the manifest should probably say which.
- **Should checkpoints be ordered dependencies?** Right now checkpoint 4 can pass while 1 fails.
  That is honest, but a strict mode that gates later checkpoints might focus the work better.
