# devgym — PRD v2: the practice platform

> **Status: in progress.** Phase 0 and phase 1 have landed, and phase 2 is underway. Everything
> below phase 2 is planned, not built. [PRD.md](./PRD.md) is the historical v1 spec; this is the
> live one.

## Why a v2

v1 is a queue of short problems: type an answer, get graded, build a streak. It is good at recall and
bad at everything that recall is not. Real work, and the project-based live coding it is practice
for, means sitting inside an unfamiliar codebase and making it do something new in twenty minutes.

v2 adds that, and keeps the queue exactly as it is. Two modes, one app:

- **Problems** — 225 short problems, 15-minute morning reps. Recall and recognition. Built.
- **Workouts** — 15-30 minute builds against a real toolchain: read a brief, edit real files in a
  real project, run checkpoints, see how far you got. Built, and the library is filling up.
- **Handbook** — short foundational reference for frontend, backend, database and infrastructure.
  Planned.

Framing note: this is **practice**, not interview prep. Interviews are one thing the practice is
good for. The vocabulary in the UI and the content stays "workout", "checkpoint", "run" — never
"candidate", "grade", "score".

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

Port the accumulated briefs. Each is full stack, because that is the level being practised. Four are
done: JWT login, the slow list endpoint, search on Drizzle and rate limiting. The rest are still to
write.

| Workout                             | Stack                     | Shape    |
| ----------------------------------- | ------------------------- | -------- |
| Infinite scroll with retry          | React + local fixture API | feature  |
| Drag-and-drop ordering, persisted   | React + Zustand + API     | feature  |
| Autocomplete: debounce, abort, a11y | React + API               | feature  |
| N+1 in the orders report            | TypeORM                   | bug-hunt |
| Auth check on the wrong layer       | NestJS guards             | bug-hunt |

**Prisma is off the list.** The plan was the same search brief on a second ORM, which is exactly the
"practise against a stack you do not know" case. It does not fit: Prisma generates its client with
`prisma generate`, which is a build step in a package that deliberately has none, and there is no
PGlite driver adapter for it, so it would also need one written against Prisma's adapter API rather
than the thirty lines Kysely needed. Both are solvable and neither is worth it for one workout. If a
second ORM is wanted, TypeORM and Sequelize both connect without codegen.

Three adaptations the offline constraint forces, all of which improve the exercise:

- **jsonplaceholder → a local fixture endpoint** with the same response shape, plus fault injection
  so "handle failures and allow retry" is actually testable.
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

Short foundational reference, deliberately not exhaustive. Sections for frontend, backend, database
and infrastructure. Each page is one concept, a worked example, and a link to the problems and
workouts that exercise it. The `relevance` axis already carries the right signal: a `foundational`
problem is a handbook page waiting to be written.

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
