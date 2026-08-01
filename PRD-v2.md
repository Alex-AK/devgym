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

- `packages/workouts/` with the scaffold and one workout.
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

The second workout is what proved the format: it added Express, jose and supertest to
`packages/workouts/package.json` and touched no application source at all.

---

## 2. Roadmap

### Phase 2 — the workout library

Port the accumulated briefs. Each is full stack, because that is the level being practised. JWT login
is done; the rest are still to write.

| Workout                             | Stack                          | Shape    |
| ----------------------------------- | ------------------------------ | -------- |
| Search with pagination              | Drizzle + PGlite               | feature  |
| Search with pagination              | Prisma + PGlite                | feature  |
| Rate limiting middleware            | Express + fake Redis           | feature  |
| Infinite scroll with retry          | React + local fixture API      | feature  |
| Drag-and-drop ordering, persisted   | React + Zustand + API          | feature  |
| Autocomplete: debounce, abort, a11y | React + API                    | feature  |
| The list endpoint is slow           | Kysely + PGlite, index missing | bug-hunt |
| N+1 in the orders report            | TypeORM                        | bug-hunt |
| Auth check on the wrong layer       | NestJS guards                  | bug-hunt |

Three adaptations the offline constraint forces, all of which improve the exercise:

- **jsonplaceholder → a local fixture endpoint** with the same response shape, plus fault injection
  so "handle failures and allow retry" is actually testable.
- **Redis → a small in-repo fake** with the real `ioredis` surface (`incr`, `expire`, `ttl`), so the
  code written is real Redis code.
- **Postgres → PGlite**, a WASM Postgres running in-process. Real `ILIKE`, real `EXPLAIN`, no server.
  This is also what makes a genuine query-optimisation workout possible.

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
