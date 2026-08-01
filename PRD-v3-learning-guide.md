# devgym — PRD v3: the learning guide

> **Status: planned, not started.** This extends [PRD-v2](./PRD-v2.md), which remains the live spec
> for the workout platform and for what a handbook page is (its phase 4). This document is the map
> the handbook grows into: a full curriculum, built from years of collected-but-unexecuted study
> material, with sources credited on every page. Siblings:
> [PRD-v3-content-roadmap](./PRD-v3-content-roadmap.md) for the problem and workout queue, and
> [PRD-v3-open-source](./PRD-v3-open-source.md) for the about page and the citation policy this
> document depends on.

## Why

The source material is a personal vault built up over several years: system design link lists,
worked course notes on JavaScript and React and NestJS, a deep Postgres performance guide, reading
lists, study plans. Almost none of it was ever executed. Learning happened on the job instead, and
with LLMs now doing more of the work, on-the-job learning is thinning out: it is easy to ship
something you never actually understood.

Two lines from the vault are the premises of this whole effort:

- "Your issue isn't lack of knowledge, it's execution under pressure." The problems and workouts
  answer this, and already exist.
- "Spending time deeply studying topics would be advantageous for me. No more skimming docs or
  doing trial and error to solve problems." The guide answers this one.

The guide is not a second wiki to skim. It is the study half of the gym: short pages you read
deliberately, each wired to the problems and workouts that make you prove you absorbed it. The
vault also contains its own best framing for how to use it, worth preserving: one concept a day,
draw the diagram, summarise it in two or three lines, explain it out loud.

## What PRD-v2 already settled

Everything in v2 phase 4 stands unchanged and is not restated here:

- **What a page is**: the question it answers, the mental model, a worked example, the traps,
  where to practise. A page that can't fill the traps section honestly doesn't get written.
- **The two-way links**: pages list the problems and workouts that exercise them; briefs link back.
- **The page lists for 4a (moving data), 4b (headers) and 4c (caching)**. Those are three sections
  of the guide below, verbatim.

v2's 4d was a flat "the rest" list. This map gives each of those pages a section to live in.

## The shape

Same principle as workouts: **content is a directory, not code.**

```
packages/handbook/content/<section>/<slug>.md
```

Each page is markdown with frontmatter: `title`, `question`, `practise` (problem and workout
slugs), `sources` (author, title, url), and `verified` (the date the page's claims were last
checked against its sources, shown in the UI; honest bookkeeping given how the content is
written). Adding or editing a page touches no application source.

Pages are written to read fine as plain markdown on GitHub, since the repo is public and that
reach is free. The app adds what GitHub can't: section navigation and `practise` links resolved
to live problems and workouts.

The safety net runs in `pnpm verify`, like everything else:

- every page has at least one source, and no source URL is a link shortener (`lnkd.in`, `bit.ly`,
  `buff.ly` and friends are rejected outright)
- every `practise` slug resolves to a real problem or workout
- every page has all five parts of the shape

The UI stays minimal: a section list, a page view, and the links in both directions. No search, no
progress tracking on pages themselves; the problems are the progress tracking.

## The map

Ten sections. Web first throughout; each section notes what vault material feeds it and who gets
credited (see the open-source PRD for the citation policy itself).

### 1. JavaScript, under the hood

The vault's most complete notes: values vs references, primitives and immutability, the three
kinds of equality, mutation, prototypes. These are worked notes from Dan Abramov's _Just
JavaScript_ (justjavascript.com), confirmed by the author of the notes, so every page in this
section credits it.

Pages: values and references (why copying an object doesn't copy it); primitives are immutable
(why `str[0] = 'x'` does nothing, and autoboxing); equality (`==`, `===`, `Object.is`, and the
`NaN` and `-0` corners); mutation (shared references, and why "is mutation bad" is the wrong
question); prototypes (what the chain lookup actually does); closures (a gap in the notes, but the
stale-closure problems already need it); the event loop (from v2 4d: microtasks, macrotasks, what
"blocking" means with one thread).

### 2. React, beyond the API

From the epic react notes, which are course notes from Kent C. Dodds' _Epic React_
(epicreact.dev, confirmed by the author of the notes) mixed with real production experience (a
bundle optimisation campaign with before/after numbers). Credits: Epic React and Kent C. Dodds'
blog, Ryan Florence's inline-functions article, react.dev, web.dev's long-tasks material, Philip
Walton on differential serving.

Pages: what a render actually is (render, reconcile, commit; fix the slow render before the
re-render); context and re-render scope (why every consumer re-renders, splitting state from
dispatch); where state lives (URL, server cache, component; from v2 4d); code splitting and lazy
loading (including when it makes the bundle bigger, which the notes measured firsthand); long
lists (windowing, and when pagination beats it); the main thread (long tasks, yielding, workers).

### 3. Moving data between machines

v2 4a, verbatim: the thirteen transport pages, the four questions that pick one, and the decision
page. One enrichment from the web sockets note, which is grounded in running Socket.IO in
production at scale: the WebSockets page gets a companion, **delivery guarantees over a socket**
(what reconnection actually loses, client vs server buffering, at-least-once via acks, and the
offset-and-replay pattern for missed events). Credits: the Socket.IO v4 docs, MDN.

### 4. Headers

v2 4b, verbatim.

### 5. Caching, client and server

v2 4c, verbatim.

### 6. APIs in practice

From the learning journal's strongest threads: API design principles, pagination, idempotency.
This is where auth vs authz from v2 4d lands too.

Pages: pagination (offset vs cursor, and why offset degrades); idempotency (per-method semantics,
idempotency keys, the check-store-replay flow); API versioning and lifecycle; rate limiting (the
five algorithms: token bucket, leaky bucket, fixed window, sliding window, sliding window log, and
the harder question of what to key on); auth vs authz, sessions vs tokens, where the check belongs
(two workouts already point here). Credits: resolve the vault's Stripe idempotency and rate
limiting case studies to their canonical posts.

### 7. Databases

The readiest material in the vault: a 1,600-line Postgres performance guide with worked SQL for
everything. One honesty note carried into every page: that guide's body is itself LLM-generated,
so its claims get verified against primary sources and the citations point at those, not at the
note. Credits: Markus Winand's _Use The Index, Luke_, the PostgreSQL docs, explain.depesz.com.

Pages: how an index actually gets used, and why the planner sometimes refuses one (v2 4d; workout
3 is the practical half); composite indexes and column order (the leftmost-prefix rule); partial
and expression indexes; reading EXPLAIN (scan types, join types, estimates vs actuals, and the
red flags); N+1 and how to see it (v2 4d; the query log, not the stopwatch); pagination at the
database (keyset, and the tuple-comparison trick); query refactorings that matter (EXISTS vs
COUNT, OR into UNION, unpicking correlated subqueries); transactions and ACID (a gap in the
notes, and a prerequisite for the systems section).

Engine honesty: the guide teaches Postgres, devgym runs SQLite and PGlite. Pages say which engine
they mean and note where SQLite differs (no ILIKE, different EXPLAIN output).

### 8. The server runtime

From the vault's server section and the NestJS notes, which are course notes from Stephen
Grider's NestJS Udemy course (confirmed by the author of the notes). The course is paywalled, so
it's credited as inspiration while every claim cites open references: the Node, nginx, NestJS
and TypeORM docs.

Pages: one thread, many connections (the process, thread and event models via Apache, nginx and
Node, which the vault already compares); the life of a request in a framework (pipe, guard,
controller, service, repository; Nest as the worked example, and workout 8 as the practice);
dependency injection (what problem inversion of control solves, and the decorator-metadata trap
the scaffold already documents); failure and retries (v2 4d: timeouts, backoff, jitter,
idempotency keys); background work (pairs with the queues page in 4a).

### 9. Systems, one concept at a time

The vault's largest single category: hundreds of collected system design links, none processed.
The organising decision, straight from the vault's own conclusion: **concepts before case
studies.** You fail system design conversations on fundamentals, not on not having read enough
architectures.

Pages, one concept each, deliberately card-sized: what happens on a request, DNS to response (the
spine, from v2 4d); scalability, horizontal vs vertical; latency vs throughput; load balancers
and what they change (v2 4d); CAP and consistency (strong vs eventual); replication; sharding
and partitioning; caching patterns (cache-aside, write-through, stampedes; bridges to section 5);
message queues and delivery semantics; consistent hashing; service discovery; circuit breakers;
back-of-envelope estimation.

Each card pairs with an explain-graded problem in the new `systems` category (see the content
roadmap), which is v2 phase 5 option 1 landing for real. A curated case-study shelf (the Stripe,
Slack, Uber, YouTube studies from the vault, resolved to canonical URLs) hangs off this section
as further reading, not as pages. Where a vault shortlink is dead or its author can't be
identified, a same-topic study from another author takes its place, credited as itself: the
shelf documents good reading, not the vault's history.

Credits: Donne Martin's System Design Primer, Alex Xu / ByteByteGo, Martin Kleppmann's _Designing
Data-Intensive Applications_, the papers-we-love collection, and per-card case studies once the
vault's shortlinks are resolved to their actual authors.

### 10. Trade-offs and architecture

Last and thinnest, because it resists the page shape: trade-off thinking is learned in
retrospectives, not reference pages. Start with three pages that can honestly fill a traps
section: monolith, modules, services (when each is the right call); migrating without stopping
(strangler fig, and holding the line with ratchet tooling); prudent vs reckless technical debt.
The vault's 15-item architecture reading list survives as this section's further-reading shelf,
with every book credited. Credits: refactoring.guru, Microsoft's strangler-fig page, Will
Larson's migrations essay, the listed books.

### Deliberately absent

- **TypeScript**: stays problem-led. The vault has only stubs, and the existing 22 problems carry
  it. A section gets written when its pages can pass the traps test.
- **Mobile and desktop**: the stated priority is web. The vault's React Native vs Flutter notes
  wait until the web map is substantially built.
- **DSA theory**: the patterns become coding problems (content roadmap), not guide pages. A page
  about sliding window teaches less than three graded implementations of it.

## Build order

1. **Moving data** (v2 already names it first; it unblocks the SSE and WebSocket workouts)
2. **Databases** (the material is readiest, and workouts 3 and 7 already exercise it)
3. **JavaScript, under the hood** (second-readiest notes, source already confirmed)
4. **APIs in practice** (short section, feeds three planned workouts)
5. **Headers**, then **Caching** (as specified in v2)
6. **React, beyond the API**
7. **The server runtime**
8. **Systems** (paired with the `systems` problem category shipping alongside)
9. **Trade-offs** last

Cadence mirrors the content rule from v2: a section is never finished, and a page at a time is a
fine pace. The gate for shipping any page is the safety net plus the citation policy, not
completeness of its section.

## Non-goals

- Not a wiki, not exhaustive, and never a mirror of someone else's course. Pages are written
  fresh in the project's shape; sources are credited, never reproduced.
- No page-level progress tracking, streaks or completion states. Problems and workouts measure
  progress; pages are reference.
- No search until the page count demands it.

## Open questions

None. The first draft raised three (where the handbook renders, verification dates,
dead-shortlink replacements); all are decided and folded into the body above. The NestJS course
attribution is confirmed and recorded in the open-source PRD, along with the rule it triggered:
paywalled courses are credited as inspiration, and page claims cite open references.
