# devgym — PRD v3: the learning guide

> **Status: in progress.** The shape is built: `packages/handbook/content/`, the safety net in
> `pnpm verify`, and the section list and page view in the app. Sections 1 (JavaScript), 2 (React), 3
> (moving data), 4 (headers), 5 (caching), 6 (APIs), 7 (databases), 8 (the server runtime) and 9
> (systems) are underway; every concept section 9's card list names now has a card, though its
> case-study shelf does not exist yet, and it has no workout. Sections 11 (TypeScript), 12 (the
> browser), 16 (writing SQL) and 17 (security) have shipped whole, and section 17 took the
> security-headers page section 4 was owed with it, so headers is complete too. Section 10
> (trade-offs) is not started.
> Seven further sections have been added since the first draft: TypeScript and the browser you are
> writing for, both by the pairing rule; AI engineering, running it in production, and data
> structures, from a topic pass that moved the scope once, deliberately and by decision; then writing
> SQL and security past the headers, from an audit that checked every problem against every page's
> `practise` list instead of trusting the section titles.
>
> This extends [PRD-v2](./PRD-v2.md), which remains the live spec for the workout platform and for
> what a handbook page is (its phase 4). This document is the map
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

### Diagrams

Some of this material is a diagram or it is nothing. A ring of servers, a partition splitting two
datacentres, a request crossing four hops: prose describing those is prose being read twice.

The shipped systems cards already draw in fenced ASCII blocks, and it works better than expected, so
that stays the floor and costs nothing. The proposal above it is **Mermaid in a fenced block**, which
keeps a diagram as diffable text in the repo, renders on GitHub without help, and needs one
dependency in the web app.

**That dependency is a decision, not a detail**, and it is this wave's equivalent of the workout
dependency batch: `mermaid` is not small, and it lands in the app bundle rather than in a workout
workspace. The alternatives are honest ones. Committed SVG needs no dependency and gives up
diffability and easy authoring. Staying with ASCII needs nothing at all and caps what can be drawn.

**Interactive diagrams are deferred, with the reason recorded.** A diagram you can drag a node around
in is application code per diagram, which breaks the rule the whole library rests on. Revisit only if
a specific concept proves it cannot be taught any other way, and then build that one thing rather
than a framework for it.

## Pairing: reps for every page, pages for every rep

The guide and the problem set are two halves of one library, and the standing rule is that neither
half runs far ahead of the other:

- **Every page names somewhere to practise it.** Already enforced: a page with an empty `practise`
  list fails `pnpm verify`. This is what stops the guide becoming a wiki nobody opens.
- **Every area with real practice volume earns pages.** Not enforceable mechanically, and the
  direction that actually drifts. A category can grow to thirty problems while the concept behind
  them is written down nowhere.

**Not 1:1, deliberately.** A page can be served by problems from three categories, and a category
can back several pages. The target is that no page is unpractised and no substantial category is
unexplained, not a matching count on each side.

### A third direction, found once both others were closed

Pairing counts whether a page has reps. It says nothing about whether a reader can _reach_ them, and
those turned out to be different questions. **Forty-five of ninety-five pages had no easy problem at
all**: fully paired by the rule above, and yet you finish reading and the first thing offered is the
hard version. That is the on-ramp missing, and it is invisible to the check that only asks whether
the `practise` list is empty.

Thirty-seven easy problems closed all but nine of them. The nine that remain are refusals rather than
debt, and the reason is the rule the sweep produced: **an easy rep is a real thing met in ordinary
feature work, answered in under two minutes by someone who has just read the page.** A definition to
recall is not one. Back-of-envelope estimation is performed out loud in an interview, consistent
hashing is consumed rather than configured, and a card written to fill the row would teach that the
definition was the point. A page is allowed to have no on-ramp when it honestly has none.

This is not mechanically enforced, deliberately. "Has an easy problem" is checkable and would be the
wrong thing to check, because passing it by writing trivia is easier than passing it honestly.

### Check the shelf before writing

Topic requests arrive as lists, and a list does not know what has already shipped. Four came in on
the last pass that were already written, so the check is now a step: grep `packages/handbook/content`
first, and if a page exists, the item is an edit to that page or it is nothing.

| Asked for                  | Already lives in                                                     |
| -------------------------- | -------------------------------------------------------------------- |
| Rate limiting              | `apis/rate-limiting.md`, with the five algorithms and what to key on |
| Write DB and read replicas | `systems/replication.md`, including replica lag and read-your-writes |
| RESTful                    | `moving-data/rest-in-practice.md`                                    |
| Stateless                  | `systems/scaling-up-and-out.md` (state is the thing that blocks it)  |
| Express middleware         | `server-runtime/the-life-of-a-request.md`, in Nest's vocabulary only |

The last row is the interesting one, and the reason this table is a step rather than a rule: the page
exists, it covers the concept, and it never says `next()`. That is a real gap inside a covered topic,
so it earned an Express page in section 8 rather than a shrug.

Where it stands, and it is lopsided in one direction:

The audit that produced the bottom half of this table counted, for every problem, whether any page's
`practise` list names it. That is a sharper instrument than reading section titles, and it found four
areas nothing was tracking.

| Area                                                           | Practice                  | Pages | Gap                          |
| -------------------------------------------------------------- | ------------------------- | ----- | ---------------------------- |
| Moving data, headers, caching, APIs, databases, server runtime | yes                       | yes   | paired                       |
| React                                                          | 30+ problems, one workout | yes   | paired                       |
| JavaScript under the hood                                      | yes                       | yes   | no workout yet               |
| Systems                                                        | ~19 cards                 | yes   | **no workout, and 13 pages** |
| Writing SQL                                                    | 29 problems               | yes   | paired                       |
| Security past the headers                                      | 18 problems               | yes   | paired                       |
| The DOM you still write                                        | 9 problems                | yes   | paired, in section 12        |
| **`URL` and `URLSearchParams`**                                | 10 uncited of 10          | none  | **a module, not a section**  |
| TypeScript                                                     | 34 problems               | yes   | paired                       |
| HTML, accessibility, CSS, forms, DOM                           | ~56 problems              | yes   | paired                       |
| **Dates and time**                                             | 10 problems               | none  | **a module, not a section**  |
| Testing                                                        | 8 problems                | none  | deferred, threshold below    |
| Trade-offs and architecture                                    | none                      | none  | neither half exists          |

Three of those four resolve into new pages, and one does not, which is the interesting result.
**`URL` and `URLSearchParams` is an API, not a concept**: repeated keys, `set` against `append`, the
plus-sign space trap, and when `encodeURIComponent` is the wrong tool. A page explaining a mental
model is the wrong shape for that; a module you sit down with is the right one, so it moves to
[PRD-v4](./PRD-v4-modules.md). **Dates goes the same way**, to the `js-date` module already specified
there. Both were being counted as handbook debt when the handbook was never the right home.

**Systems is the strongest signal in the table now**, and it inverted while nobody was looking.
Thirteen cards, every one paired with an explain-graded problem, and not a single workout. The
content roadmap's own rule says a section with no workout is the worst case, because a workout is the
only place the reading gets tested under time pressure. The roadmap now carries one.

**Testing is deferred, with the threshold stated** so it is a decision rather than an oversight. Eight
problems, all of them about testing-library and React, is the thinnest case in the table. It earns a
section when the category grows past the JavaScript section's size or when a workout's checkpoints
are about the tests themselves, whichever lands first.

**The TypeScript decision is revisited.** This document originally put TypeScript under
"deliberately absent" on the grounds that the vault had only stubs and the existing problems carried
it. The problem set has since roughly doubled and now reaches conditional types, `infer`, mapped-type
key remapping and assertion functions. That is well past what a prompt and a hint can explain on
their own, so TypeScript earns a section. The original reasoning was about source material; the
pairing rule is about the reader, and the reader wins.

The same test applies to anything else in "deliberately absent": it stays absent until its practice
volume says otherwise, and then it gets written.

## The map

Web first throughout; each section notes what vault material feeds it and who gets credited (see the
open-source PRD for the citation policy itself). The count is deliberately not stated here, because
sections get added by the pairing rule and the number went stale three times before anyone noticed.

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

Two pages were added to that list while writing it, both by the pairing rule rather than by taste.
**Effects, and what cleanup has to undo** covers the largest unpaired cluster in the category
(cleanup, object dependencies, stale closures, fetch races, aborting on unmount) and is the page the
autocomplete workout is the practical half of. **Memo, and what it cannot fix** covers four more that
the render page could only have carried by trying to teach two things at once.

### 3. Moving data between machines

v2 4a, verbatim: the thirteen transport pages, the four questions that pick one, and the decision
page. One enrichment from the web sockets note, which is grounded in running Socket.IO in
production at scale: the WebSockets page gets a companion, **delivery guarantees over a socket**
(what reconnection actually loses, client vs server buffering, at-least-once via acks, and the
offset-and-replay pattern for missed events). Credits: the Socket.IO v4 docs, MDN.

One page added: **SOAP, and why you are meeting it**. Written for the integration you inherit rather
than the service you build, which is the only honest framing left: the envelope, the WSDL, what
having a contract bought and what it cost, and how to talk to one from a stack that has moved on.
Credits: the W3C SOAP and WSDL specifications.

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

Two pages added. **Middleware, and the order it runs in** takes the Express half that the life-of-a-
request page covers only in Nest's vocabulary: what `next()` does, why error middleware takes four
arguments, and the ordering bugs that follow from mounting in the wrong place. **Three frameworks,
one request** compares Express, Nest and FastAPI on the same route, which is the one place FastAPI
earns a page: seeing a third framework name the same seams is what makes them visible as seams
rather than as Express trivia. No Python runs anywhere; it is a comparison, not an exercise.

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

A fourth page: **the dependency behind a port you own**. Redis is the worked example, because it is
the one nearly everybody reaches for and nearly nobody wraps: what an adapter buys (swapping the fake
for the real thing in tests, and surviving the day the managed instance changes), what it costs (an
interface that leaks the moment you want a Lua script or a stream), and the honest rule for when a
thin wrapper is worth it against when it is cargo cult. The workouts already ship a fake Redis with a
clock, so the practical half exists.

### 11. TypeScript, at the type level

Added by the pairing rule above, having originally been listed as deliberately absent. The problem
set now runs from utility types through conditional types, `infer`, mapped-type key remapping,
assertion functions and branded types, which is more than a prompt and three hints can carry.

Pages: what the compiler actually erases, and why runtime validation is still your job; `as` versus
an annotation versus `satisfies` (three different things, and `as` is the one that lies); the type
level as a language (conditional types, `infer`, mapped types); narrowing and control flow analysis;
generics and inference (why `T` widens, and what `const` type parameters do); structural typing and
where it stops being enough (branded types). Credits: the TypeScript handbook and release notes, and
`type-fest` as a worked reference for the harder patterns.

### 12. The browser you are writing for

The largest unpaired block: semantic HTML, accessibility, CSS layout and forms together carry
roughly fifty problems and no pages at all. One section rather than four, because the through-line
is the same in each: the platform already does most of this, and the bug is usually that something
reimplemented it.

Pages: which element means this (landmarks, sectioning, the outline myth); the accessibility tree,
and what an accessible name is computed from; focus, and the three things that break it; layout that
does not need a media query (flex, grid, container queries, intrinsic sizing); forms the browser
already validates; and what the platform gives you free that people reach for a library to get
(`<dialog>`, `<details>`, `popover`, `inputmode`). Credits: MDN, the WHATWG HTML Standard, the ARIA
Authoring Practices Guide, web.dev.

Two pages added by the audit, because the `dom` category sat outside all six of those. The
through-line still holds, it just points at JavaScript rather than markup: **events, and where they
actually go** (capture and bubble, delegation for a list that grows, `preventDefault` against
`stopPropagation`, and debounce against throttle), and **the DOM API's sharp edges** (a `NodeList` is
not an array, `dataset`, `classList.toggle` with a force argument, `IntersectionObserver` instead of
a scroll handler, and `innerHTML` with anything a user typed). That last one is also practice for
section 17, which is exactly the kind of overlap the pairing rule permits.

### 13. AI engineering, for people who ship web apps

The scope moved here, deliberately and once. devgym is web-first and stays web-first, but the things
a web engineer is now asked to build have moved: an endpoint that streams tokens, a retrieval step in
front of a model, a tool server another program drives. That is web engineering with an unfamiliar
dependency on the end of it, and it fails in web-engineering ways: timeouts, backpressure,
idempotency, cost per request.

What this section is not is machine learning. Training, model architectures and the statistics behind
them are out of scope and stay out: they fail the morning-session test and they are not what the
stack is for.

Pages: what inference actually costs you (tokens, latency, and why the p99 is a different animal when
the dependency is generative); streaming a model response (SSE and chunked transfer, which
[section 3](#3-moving-data-between-machines) already owns the transport half of); embeddings and
vector search (what a nearest-neighbour lookup does and does not promise); retrieval, honestly (the
plumbing, chunking, and why the retrieval step is usually the bug); MCP servers (what the protocol
actually specifies, and why a tool boundary is an API design problem you have solved before); evals
as tests (deterministic assertions against a non-deterministic dependency). Credits: the Model
Context Protocol specification, the provider API docs, and open papers where a claim needs one.

### 14. Running it in production

The vault's "infrastructure" pile, refined into the part a web engineer owns. Not a cloud
certification: the question each page answers is what changes about your code when it stops being a
process on your laptop.

Pages: what a deploy actually is (artefact, config, and the swap); processes, containers and what the
image is really doing; configuration and secrets (why the environment, and where that stops being
enough); health, readiness and the difference (which
[load balancers](#9-systems-one-concept-at-a-time) already meets from the other side); logs, metrics
and traces (three answers to three different questions, and the cardinality trap); zero-downtime
releases and the migration that has to go first. Credits: the Twelve-Factor App, the Docker and
Kubernetes docs, OpenTelemetry.

### 15. Data structures and the cost of a choice

This section exists because a decision below was reversed; see "Reversed, with the reasoning
recorded".

Not an algorithms course. Every page answers the same question in a different shape: what does this
choice cost at the size you actually have. Array against object against `Map` against `Set` is a
decision web code makes hourly and usually by reflex.

Pages: array, object, `Map`, `Set` (lookup, insertion, iteration order, and what a key can be);
what O notation is for, and the constant factors that beat it under a few thousand items; the
structures behind the ones you use (hash tables, and why a bad key function is the whole story);
sorting, and the comparator bugs that survive review; trees and the shapes real systems use them for
(the B-tree the [databases section](#7-databases) already assumes); when the right answer is a
database rather than a data structure. Credits: MDN, the V8 blog, open algorithms references.

It pairs with the `dsa-patterns` problem category in the content roadmap, which stays the place the
patterns themselves get practised.

### 16. Writing SQL

**Shipped.** Found by the audit and the largest single miss in it. `sql` is the second-biggest
category in the repo and almost none of it was explained anywhere, because section 7 turned out to be
about performance rather than about SQL: indexes, plans, N+1 and pagination, all of which assume you
can already write the query being made slow.

Writing it produced a rule worth keeping for any page about a language with an engine underneath.
**Every number on these pages was produced by running the query against `practice.db`**, not
recalled, and doing that contradicted three things that would otherwise have shipped as fact: SQLite
accepts a select-list alias in `WHERE` where Postgres refuses, and silently resolves it to the table
column when the alias shadows one; the `RANGE` frame default repeats a running total across tied
rows rather than accumulating per row; and SQLite pushes an outer filter into a CTE instead of
fencing it. None of those is exotic, and all three were briefed the other way round.

Pages: what a join actually does (the row multiplication people meet as duplicate rows, and why
`LEFT` changes the answer and not just the row count); `NULL` is not a value (three-valued logic,
`IS NULL`, and why `NOT IN` with a null in the list returns nothing); grouping, and what you are
allowed to select; `HAVING` against `WHERE`, which is a question about when each one runs;
subqueries, CTEs and when the database stops caring which you wrote; window functions (the one
feature that turns a loop in application code into a line of SQL, and the frame clause nobody reads);
set operations and de-duplication. Engine honesty carries over from section 7 unchanged: the problems
run SQLite, so a page says which engine it means. Credits: the PostgreSQL and SQLite documentation,
and Markus Winand's writing on window functions.

This section is the reason section 7 keeps its name. Databases is where a query goes wrong; this is
where a query gets written.

### 17. Security, past the headers

**Shipped**, and it took section 4's owed security-headers page with it, since they are one afternoon
together and two afternoons apart. Found by the audit: the headers section owns the header-shaped
half, and everything else in the `security` category had no home at all.

Pages: where untrusted input becomes code (XSS in its three sites, and why `innerHTML` with user text
is the same bug as string-concatenated SQL); parameterised queries, and what an ORM does and does not
promise; storing a password (why a hash is not enough and what a work factor is for); storing a token
(cookie flags against local storage, and what each one exposes you to); the redirect you did not
validate; and secrets, and why a key in the frontend bundle is a published key. Credits: the OWASP
Cheat Sheet Series, MDN, and the specifications for the headers the section borrows from section 4.

**The scope line, stated so it does not drift**: this is what a web engineer builds and reviews, not
offensive security. No exploitation technique gets a page it does not need for the defence to make
sense.

### Deliberately absent

- **Mobile and desktop**: the stated priority is web. The vault's React Native vs Flutter notes
  wait until the web map is substantially built.
- **Machine learning proper**: training, model architectures, and the statistics under them. Section
  13 covers shipping against a model, which is web work. Building the model is not.
- **A Python stack**: FastAPI is worth one comparison page inside section 8, because comparing how
  three frameworks route a request teaches something Express alone cannot. A FastAPI _workout_ is a
  different matter: it would put a Python runtime in the workout runner, which is a much larger
  decision than a dependency line, and nothing in the queue needs it yet.

### Reversed, with the reasoning recorded

Two entries have left "deliberately absent", and both left for the same reason, so the pattern is
worth naming: the original argument was about source material, and the pairing rule is about the
reader.

- **TypeScript**, recorded above, now section 11.
- **DSA theory**, now section 15. The original entry said the patterns become coding problems, not
  guide pages, and that a page about sliding window teaches less than three graded implementations of
  it. That half still holds, and section 15 does not undo it: the patterns stay in `dsa-patterns`.
  What the original missed is that choosing a structure is not a pattern, it is a decision made in
  ordinary feature work every day, and nothing in the library explains it.

## Build order

Moving data, databases, JavaScript, APIs, headers, caching, the server runtime, React, systems,
writing SQL, TypeScript, the browser and security have all landed. **No problem category is
unexplained now**, in either direction, which is the first time that has been true. What remains is
therefore no longer ordered by unexplained practice, because there is none: it is ordered by what the
reader is missing.

1. **AI engineering** — the only section here with no practice behind it yet, so it ships alongside
   its problems rather than ahead of them (see the pairing rule; a page with an empty `practise` list
   cannot ship at all)
2. **Data structures and the cost of a choice** — pairs with `dsa-patterns`, which is itself queued
3. **Running it in production**
4. **Trade-offs and architecture** — last, as before, because it resists the page shape

**On the numbers**: these are the map's, and they are identifiers rather than reading order.
`section.json` owns what a reader sees, and the two have now diverged on purpose. Writing SQL took
display order 7 and pushed databases, the server runtime and systems each down one, because writing a
query comes before making it fast and a reader meeting the sections in order should get them that
way. Section 17 has now done the same: security took display order 7, directly after headers, pushing
caching, APIs, writing SQL, databases, the server runtime and systems each down one. The map numbers
in this document did not move, because renumbering them would invalidate every cross-reference here
for no reader benefit.

The single-page additions do not wait their turn, because each one slots into a section that already
exists: SOAP into moving data, Express middleware and the three-framework comparison into the server
runtime, the adapter page into trade-offs. Any of them is an afternoon.

Two smaller debts sit outside that order. The systems section's case-study shelf is specified above
and not built, and it is further reading rather than pages, so it does not block anything. Dates and
testing carry problems with nothing explaining them, which is the same signal that earned React and
systems their sections.

The gate for shipping any page is unchanged: the safety net plus the citation policy, not
completeness of its section. A section is never finished and a page at a time is a fine pace.

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
