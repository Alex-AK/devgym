# devgym — PRD v3: the content roadmap

> **Status: in progress.** The problem and workout queue drawn from the vault material, extending
> PRD-v2 phase 2. Nothing here changes how content works; it is all "what to write next", which is
> exactly how it should be.
>
> Shipped so far: the `systems` and `html` categories, the TypeScript, React, JavaScript
> mental-models and headers/security waves, and two workouts (the SSE dashboard and the
> `json-parser` pilot). Still queued: the `sql-performance`, `api-design`, `node`, `dsa-patterns`
> and `ai-engineering` categories, and the workout list below, which has grown twice since.
> `dsa-patterns` remains the one item here that needs an application change, for the queue opt-out
> flag. `ai-engineering` is the one with a deadline attached, because guide section 13 cannot ship a
> page until it exists. The two systems workouts are the top of the queue, because that section
> shipped thirteen pages with nothing to build against. Siblings:
> [PRD-v3-learning-guide](./PRD-v3-learning-guide.md),
> [PRD-v3-open-source](./PRD-v3-open-source.md), and
> [PRD-v4-modules](./PRD-v4-modules.md) for the fourth content type.

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

Five new categories and four waves inside existing ones; the seed directory is the live count. Every problem still declares `relevance` honestly; the DSA category in particular
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

**Decided: `dsa-patterns` stays out of the daily queue.** DSA is a separate track you enter on
purpose, via focused practice (`/practice?category=dsa-patterns`) or its own session preset, not
something the morning round-robin deals you. This is the one item in this document that needs an
application change: the queue currently treats all categories equally, so categories need an
opt-out flag the session builder respects. Small, but it is code, not content.

**`ai-engineering` — the web half of shipping against a model.** Added with guide section 13, and
added _because_ of it: that section cannot ship a single page until this category exists, since a
page with an empty `practise` list fails `pnpm verify`. Streaming a token response and what the
client has to do with it, timeouts and retries against a slow generative dependency, idempotency when
the expensive call is the one you are retrying, chunking and what a nearest-neighbour result actually
promises, an MCP tool boundary read as API design, and turning a non-deterministic output into a
deterministic assertion. Mostly explain and short-text, with js-code where the exercise is genuinely
plumbing. Around 12 to start.

**No model runs anywhere in this category.** Every problem is about the code around the dependency,
which is the part that fails in production and the only part that can be graded deterministically
offline. A problem that needs an inference call to grade is a problem this project will not have.

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

The v2 coverage table names transport as the widest gap, and the vault material agrees loudly (the
web sockets note is the deepest production experience in it). Queue, roughly in order:

**Shipped since this document was written:** the SSE dashboard and the `json-parser` pilot.

### Queued

| Workout                     | Stack                     | Shape    | The lesson                                                                                         |
| --------------------------- | ------------------------- | -------- | -------------------------------------------------------------------------------------------------- |
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

### Ten more, noodled

Chosen to close pairing gaps rather than to pile onto areas that already have workouts. The
handbook column is what each one is the practical half of.

| Workout                       | Stack                 | Shape    | Pairs with  | The lesson                                                                                        |
| ----------------------------- | --------------------- | -------- | ----------- | ------------------------------------------------------------------------------------------------- |
| Cache the expensive report    | Express + fake Redis  | feature  | caching     | Cache-aside with a TTL, then the stampede: fifty concurrent misses must recompute once, not fifty |
| Accessible data table         | React                 | feature  | the browser | A sortable table a screen reader can use: `scope`, `aria-sort`, caption, and keyboard ordering    |
| The form that loses your work | React                 | bug-hunt | the browser | Errors nobody is told about: association, focus to the first failure, and the double submit       |
| Timezone-correct booking      | Node + fixed clock    | bug-hunt | dates       | Store UTC, render local, and survive the DST boundary the fixture lands on                        |
| The migration that locks up   | PGlite                | feature  | databases   | Add a NOT NULL column to a large table without holding a long lock; backfill in batches           |
| Sessions, not just tokens     | Express + SQLite      | feature  | APIs        | Revocation is the thing a stateless JWT cannot do; rotate, revoke, and prove it takes effect      |
| The audit row that lied       | SQLite + transactions | bug-hunt | databases   | The state change and its audit row must land together or not at all; the checkpoint interrupts it |
| Streaming a big export        | Express + React       | feature  | moving data | A CSV that must not buffer; the checkpoint measures peak buffered bytes, not wall-clock time      |
| Optimistic UI that rolls back | React                 | feature  | React       | Apply now, reconcile later, roll back on failure without discarding edits made in the meantime    |
| Search that ignores accents   | Drizzle + PGlite      | bug-hunt | databases   | Normalisation and collation: "cafe" has to find "café", and the index has to survive the fix      |

Every one of these runs on infrastructure that already exists (PGlite, the fake Redis and its clock,
the fixture API, testing-library) except where noted below.

### The systems section has no workout, and that is now the top of this queue

A pairing audit found the inversion. Guide section 9 shipped thirteen cards, every one of them paired
with an explain-graded problem, and not one workout points at it. By this document's own rule that is
the worst state in the library: a section with no workout is reading that has never been tested under
time pressure, and systems is the material where knowing the words and being able to build the thing
diverge most.

Two, and they are deliberately the two concepts that are code rather than architecture:

| Workout                  | Stack             | Shape   | Pairs with       | The lesson                                                                                       |
| ------------------------ | ----------------- | ------- | ---------------- | ------------------------------------------------------------------------------------------------ |
| Build a circuit breaker  | Node + fake clock | feature | circuit breakers | Closed, open, half-open, and the timeout without which the counter never trips. No dependencies  |
| One recompute, not fifty | Node + fake clock | feature | caching patterns | Single-flight: concurrent callers for a cold key wait on one computation. The dedupe is the test |

Both follow the build-your-own recipe the `json-parser` pilot proved: zero dependencies, checkpoints
that map to stages, and a clock the real thing does not have, which is what makes a timing-dependent
lesson deterministic to grade. The second overlaps the queued "Cache the expensive report" on
purpose and from the other side: that one is cache-aside in an Express app, this one is the primitive
underneath it in isolation. If writing them proves that is one workout rather than two, merge them
and say so here.

**`json-parser` is the one workout no page cites**, which is the same gap pointing the other way. It
gets a `practise` line on the data structures section's parsing material when section 15 lands, or an
honest note here that a build-your-own workout is allowed to be its own reward.

**The dependency decision is taken.** Three queued workouts named new dependencies, and they were
raised together rather than one at a time: `graphql` for the N+1 bug-hunt (deferred in this document
until the transport pages existed, which they now do), `react-window` for the windowed list, and
`zustand` for drag-and-drop ordering. All three are in `packages/workouts/package.json`, so those
workouts are now content like every other one. Adding a dependency stays a decision rather than a
reflex: it is the one part of a workout that is not just a directory.

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

## Pairing is the sizing rule

The learning guide states it from the guide's side; here is what it means for this queue. Content is
picked to close a gap between the three halves of the library, not to top up whichever one is
easiest to add to:

- **A handbook section with no workout** is the strongest signal, because a workout is the only place
  the reading gets tested under time pressure. Caching, the browser material and dates all have or
  will have pages with nothing to build against.
- **A problem category with no pages** is the next strongest. React and systems have since been
  written; TypeScript, the HTML/a11y/CSS/forms block, SQL and security are still in that state, and
  the guide owes sections for each.
- **A category can be paired by a module rather than a page**, which is new with
  [PRD-v4](./PRD-v4-modules.md). `query-params` and `dates` are both satisfied that way, because both
  are one API met edge by edge rather than a model to explain. The test is in that document: a model
  is a page, an API is a module.
- **A page with no problems** cannot ship at all: `pnpm verify` rejects an empty `practise` list.
  That direction is already solved and needs no policy.

It does not have to be 1:1 and should not be. One workout can be the practical half of four pages,
and one page can be practised by problems from three categories. The rule is that nothing is
orphaned, not that the counts match.

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
