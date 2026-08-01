# devgym — PRD v3: the content roadmap

> **Status: in progress.** Shipped so far: the `systems` and `html` categories, the TypeScript,
> React, JavaScript mental-models and headers/security waves, and two workouts (the SSE dashboard
> and the `json-parser` build-your-own pilot). Still queued: the `sql-performance`, `api-design`,
> `node` and `dsa-patterns` categories, and the rest of the workout list below. `dsa-patterns`
> remains the one item here that needs an application change, for the queue opt-out flag.
> The problem and workout queue drawn from the vault material,
> extending PRD-v2 phase 2. Nothing here changes how content works; it is all "what to write
> next", which is exactly how it should be. Siblings:
> [PRD-v3-learning-guide](./PRD-v3-learning-guide.md),
> [PRD-v3-open-source](./PRD-v3-open-source.md).

## Why

The vault's sharpest self-diagnosis is already the gym's thesis: the gap is execution under
pressure, not knowledge. It also names the method the workouts independently arrived at: "rebuild
the same feature multiple times across different ORM setups to cement knowledge." So the roadmap's
job is not to invent a philosophy. It is to convert the vault's specific, accumulated wants into
seed files and workout directories, and to pair each wave with the guide section it exercises.

Two standing rules from v2 carry over: breadth of stack is a goal in itself, and content must stay
cheap to add. Every item below is a seed-file entry or a directory; none requires application
changes, except where explicitly flagged (there is exactly one: the queue opt-out flag for
`dsa-patterns`).

## Problems

Current state: ~230 problems across 16 categories. Five new categories and four waves inside
existing ones. Every problem still declares `relevance` honestly; the DSA category in particular
leans `foundational` and `occasional`, and that is the point of the axis.

### New categories

**`systems` — one concept, explained.** The explain grader, which is v2 phase 5 option 1 shipping
for real. One card per concept from guide section 9: scalability, latency vs throughput, CAP,
strong vs eventual consistency, replication, sharding, caching patterns, message queues and
delivery semantics, consistent hashing, service discovery, circuit breakers, idempotency,
back-of-envelope estimation, what happens on a request. Around 20 to start. The vault's study
routine (one concept a day, explain it out loud) is literally this category in a 15-minute
session.

**`sql-performance` — read the plan, name the fix.** The Postgres guide converted into reps.
Problems present a captured EXPLAIN or EXPLAIN ANALYZE output and ask what is wrong or which
index fixes it (short-text and explain graders over plan text, which keeps grading deterministic
and engine-honest), plus a few live `sql` problems where the rewrite itself is graded: EXISTS vs
COUNT, filter before joining, keyset pagination. Around 15 to start. Captured plans are stored
with the query and dataset that produced them, so a plan can be regenerated when engines update
instead of rotting as a string; the test suite asserts each stored query still yields the shape
its problem describes.

**`api-design`** — pagination offset vs cursor, idempotency keys and the check-store-replay flow,
versioning, rate limit algorithms and what to key on, status code choices beyond the basics.
Mostly explain and short-text. Around 12.

**`node` — the runtime itself.** Event loop ordering (beyond what js-apis covers), streams and
backpressure basics, buffers, process vs worker threads, what blocks and what doesn't. Mix of
js-code and short-text. Around 12.

**`dsa-patterns` — the classic patterns, honestly labelled.** The vault's list: two pointers,
sliding window, fast and slow pointers, prefix sum, monotonic stack, top-K with a heap, binary
search variants, intervals, BFS/DFS, backtracking, basic DP. Two or three js-code problems per
pattern, graded by the existing coding grader against real assertions, exactly like chunk and
LRU today. The vault's own strategy note is the authoring guide: pick a few problems per
pattern, and understand why the solution works rather than memorising it. Around 30, added in
pattern-sized waves.

**Decided: this category stays out of the daily queue.** DSA is a separate track you enter on
purpose, via focused practice (`/practice?category=dsa-patterns`) or its own session preset, not
something the morning round-robin deals you. This is the one item in this document that needs an
application change: the queue currently treats all categories equally, so categories need an
opt-out flag the session builder respects. Small, but it is code, not content.

### Waves in existing categories

- **js-apis / debugging**: a mental-models wave from the _Just JavaScript_ notes. Predict-the-
  output on shared references, the `duplicateSpreadsheet` copy-vs-reference bug, `NaN` and `-0`
  equality, autoboxing, prototype shadowing. These are the bugs the notes flagged as "missed due
  to fast thinking", which is precisely what reps fix.
- **react**: a performance wave. Context re-render scope, state vs dispatch context splitting,
  memo and when it does nothing, keys under reordering, lazy loading that grows the bundle.
- **http / security**: a headers wave paired with guide sections 4 and 5. The `no-store` vs
  `no-cache` vs `max-age=0` distinction, `Vary`, ETag and 304, CORS with credentials,
  `X-Forwarded-For` trust, CSP and HSTS basics.
- **typescript**: an advanced wave from the vault stubs: `keyof`, `satisfies`, conditional and
  mapped types, `as` vs annotation.

## Workouts

Current state: 8 workouts. The v2 coverage table names transport as the widest gap, and the vault
material agrees loudly (the web sockets note is the deepest production experience in it). Queue,
roughly in order:

| Workout                     | Stack                     | Shape    | The lesson                                                                                         |
| --------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
| Live dashboard over SSE     | Express + React           | feature  | Server push without WebSockets: reconnect, `Last-Event-ID`, and why SSE is the skipped-past option |
| Two clients in sync         | WebSocket (`ws`) + React  | feature  | The delivery-guarantees page made real: reconnect, buffering, offset-and-replay for missed events  |
| Idempotent payment endpoint | Express + SQLite          | feature  | `Idempotency-Key` check-store-replay; the double-submit that gets through anyway is the checkpoint |
| Cursor pagination bug-hunt  | Kysely + PGlite           | bug-hunt | Offset pagination drifting under concurrent writes; keyset as the fix, plan asserted via EXPLAIN   |
| Conditional requests        | Express + React           | feature  | ETag, If-None-Match, 304; the checkpoint counts bytes on the wire, not milliseconds                |
| Retry with backoff          | React + fixture API       | feature  | Timeouts, jittered backoff, giving up honestly; fault injection already exists in the fixture      |
| Context re-render bug-hunt  | React                     | bug-hunt | A typing lag caused by one fat context; checkpoints count renders, the split is the fix            |
| Windowed list               | React + react-window      | feature  | 10,000 rows without jank; new dependency in `packages/workouts/package.json`, nothing else         |
| Job queue consumer          | Node + in-repo fake queue | feature  | At-least-once delivery means the consumer must be idempotent; the duplicate delivery is the test   |
| TypeORM relations bug-hunt  | TypeORM + SQLite          | bug-hunt | `save` vs `update`, relations loading, the nested-where trap from the learning journal, verbatim   |
| Validated request boundary  | Hono + Zod                | feature  | Two birds: first Hono workout, and schema validation as the API's front door                       |
| Search on Sequelize         | Sequelize + SQLite        | feature  | The product-search brief on a fourth ORM; stack breadth per the standing rule                      |
| Infinite scroll with retry  | React + fixture API       | feature  | Carried from the v2 backlog                                                                        |
| Drag-and-drop ordering      | React + Zustand + API     | feature  | Carried from the v2 backlog                                                                        |

Fixture and fake infrastructure already proved out in v2 (the fixture API with fault injection
and per-query delay, the fake Redis with `advanceTime`, PGlite) covers everything here. The fake
queue is the one new fake, and it follows the fake-Redis recipe: real semantics, awkward parts
kept, plus a clock the real thing doesn't have.

### The build-your-own pilot

The vault collects a whole genre the library lacks: build-your-own-X projects (Redis server, rate
limiter, JSON parser, load balancer, message broker). One already exists in miniature as workout 5. The pilot for the rest is **`json-parser`**: zero dependencies, and checkpoints that map
perfectly to stages (tokenise, flat values, nesting, escapes and number edge cases). It fits the
existing 25-30 minute format with no new mechanics.

If it lands well, the genre grows (a wire-protocol Redis clone, a tiny message broker), and only
then is it worth deciding whether "series" (multi-part workouts that build on each other) needs
real support. Same n=2 discipline v2 applies to shared helpers. The genre's inspirations get
credited on the briefs once their canonical sources are resolved (the vault's links are
shortened; the likely originals are John Crickett's Coding Challenges and the build-your-own-x
repository).

### Deferred, with reasons recorded

- **Mongo/Mongoose**: needs a real server or a heavyweight memory-server dependency; nothing in
  the vault demands document stores. Revisit if a brief genuinely needs one.
- **GraphQL server workout**: worth doing eventually (the N+1 it invites is a great bug-hunt),
  but the transport pages should exist first so the brief has somewhere to link.
- **React Native / desktop**: web is the stated priority; the platform can't checkpoint native
  targets today and should not grow that machinery speculatively.

## Sizing and cadence

Content is never finished (v2's standing rule). Waves of 10-20 problems keep the seed-file
review small; workouts land one at a time, gated by `workouts.spec.ts`. Sensible first quarter:
`systems` cards alongside guide section 9, the SSE and WebSocket workouts alongside guide section
3, and the sql-performance category alongside section 7. The pairing is the point: every guide
section ships with the reps that prove it, or it waits.

## Open questions

None right now. Plan regeneration for sql-performance is decided above. A weekly "long session"
preset (45 minutes: one workout plus a handful of cards) is deliberately deferred: it hangs on
v2's open question about whether workouts fit a morning at all, and lived use should answer that
before any preset gets built.
