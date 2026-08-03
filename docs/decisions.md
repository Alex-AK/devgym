# Decisions

Why devgym is the way it is, and what it refuses to do. Every entry here was settled once, with
real alternatives on the table, and the reasoning is not recoverable from the code. Without this
file the same questions get reopened and the same deliberate gaps get "fixed".

Nothing here is status: the code is the source of truth for what exists. `docs/content.md` holds
the rules for writing content, and `docs/roadmap.md` holds what is not built yet.

## The product and its scope

- **This is practice, not interview prep.** Interviews are one thing the practice is good for, and
  naming the project after them would narrow what gets built. The vocabulary in the UI and the
  content stays "workout", "checkpoint" and "run", never "candidate", "grade" or "score".

- **The short-problem queue was kept when workouts arrived, not replaced.** The queue is good at
  recall and bad at everything recall is not. Reading an unfamiliar codebase and making it do
  something new under a timer is the other half, and it needed a second mode rather than a redesign
  of the first.

- **Features are judged against a 15-minute morning session.** That is the session the app is built
  around, and it is the reason material that only pays off over an hour keeps losing to material
  that fits a morning.

- **Fully offline at runtime, with no convenience exceptions.** No network calls, no API keys, no
  telemetry ever, including telemetry for "understanding usage". This is a content review rule as
  much as a code one: a workout that reaches a live API breaks it as surely as a fetch on the server
  would.

- **No LLM in the grading loop.** An optional LLM feedback pass behind an API key was on the
  original roadmap and was never taken. Deterministic grading is what makes a verdict reproducible
  and inspectable from the terminal, and it is what keeps the offline constraint from being
  negotiable.

- **One user, no auth, but every user-owned row carries a `user_id`.** A single service resolves the
  current user, so adding auth later replaces that service rather than the schema. Building the UI
  for it now would be paying up front for something nobody has asked for.

- **A non-goal is a statement about the current build, not a permanent refusal.** Executing
  user-submitted code and spaced repetition were both ruled out of the first build and both were
  pulled forward later, deliberately. Reversals are recorded here with the rule they produced,
  because the rule outlives both positions.

## Content

- **Four queued items were dropped on the merits rather than because they shipped**, and they are
  recorded here so they are not re-added by someone reading the old tables in git history. **Infinite
  scroll with retry** and **drag-and-drop ordering** overlapped the retry and windowing workouts, and
  the giveaway was that their entire lesson column read "carried from the v2 backlog": a row that
  cannot say what it teaches is a row nobody chose. **Search on Sequelize** was the product-search
  brief a third time and cost a dependency, which the stack-breadth rule did not justify on its own.
  **gRPC and WebRTC pages** are not met in the feature work this project targets, and the transport
  decision page already covers when you would reach for them; tRPC keeps its page.
- **`node-fs` stays in the module list, marked as the weakest of the eight.** Recording the doubt in
  the roadmap beats dropping it and beats silence, because the next person to read the list will
  otherwise have the same reservation and no way to know it was already considered.

- **Every content type is a directory or a seed entry, never application code.** Content grows
  indefinitely, so anything that makes adding a problem, workout or page require an application
  change is a bug in the design. That is also why there is no authoring UI and should not be one.

- **The safety net is what makes volume safe.** Every canonical answer grades correct, every
  near-miss grades close, every workout solution passes and every starter fails, and it all runs in
  `pnpm verify` rather than by inspection. Content can be edited in bulk only because a machine
  checks it.

- **Breadth of stack is a goal in itself, not a side effect.** Two workouts on the same tool are
  worth less than the same two spread across tools, even when the second brief is weaker, because
  the thing being practised is reading an unfamiliar codebase under time pressure.

- **The gate for shipping a page or a workout is the safety net and the citation policy, never
  completeness of its section.** A section is never finished, and a page at a time is a fine pace.
  Waiting for a section to be whole would mean nothing ships.

- **Non-executable material is graded by keyword groups on the existing explain grader.** System
  design and behavioural questions do not fit checkpoints, and the alternatives were a self-review
  rubric or leaving them as reading with prompts. The explain grader already existed and still gives
  a verdict, which is what makes the material a rep rather than an article.

- **`dsa-patterns` stays out of the daily queue.** DSA is a separate track you enter on purpose,
  through focused practice or its own preset, not something the morning round-robin deals you. It is
  the one piece of planned content that needs application code, because the queue currently treats
  every category equally.

- **A posture is a tag, not a category, and the twelve reading reps are why.** A rep about what a
  `LEFT JOIN` condition does belongs in the SQL queue whatever shape the question takes, so a
  `reading` category would have moved twelve reps out of the queues that should deal them. The axis a
  category cannot express is the one that cuts across categories, and that is what a tag is: the
  suite refuses a tag whose reps all sit in one category, because that tag is a category wearing the
  wrong hat. The essentials path was the other candidate vehicle and was refused on the format's own
  rules; that argument is under the path below.

- **Tags do not change the morning, and that is the point.** The unscoped queue keeps dealing tagged
  reps in their categories, because interleaving is what retention wants. A tag is an entrance, so
  what shipped is a scope the queue, the session builder and focused practice all respect, plus one
  tile that enters it. The rule that keeps tags from becoming keywords is whether somebody would
  deliberately spend fifteen minutes on one; the suite enforces the weaker half of that by refusing a
  tag with no reps behind it, because an entrance to nothing is worse than no entrance.

- **Tags and the `dsa-patterns` flag stayed two mechanisms after being designed together.** They look
  alike and are opposites: a tag is opt-in, naming a slice you enter deliberately, and the category
  flag is opt-out, removing a category from a round robin that would otherwise deal it. Collapsing
  them would mean either every category becomes a tag, which is a rename, or the opt-out rides on a
  tag nobody would ever scope a session to. What they do share is the filter chain in `queue()`,
  which is where the second one goes when `dsa-patterns` arrives.

- **One JSON column, not a join table.** Every query that reads tags already loads the whole problem
  set into memory and filters there, so a join table would have bought nothing and cost a table, a
  migration and two more inserts per seed. The column is parsed defensively: a tag this build does
  not know is dropped rather than crashing the queue that contains it, so an older binary can read a
  newer seed.

- **No model runs anywhere in the AI engineering material.** Every problem is about the code around
  the dependency, which is the part that fails in production and the only part that can be graded
  deterministically offline. A problem that needs an inference call to grade is a problem this
  project will not have.

- **Pairing between reading and reps is a floor, not a scoreboard.** The target is that no page is
  unpractised and no substantial category unexplained, not a matching count on either side. A
  problem carries its own lesson in its explanation, so an uncited problem is not a debt, and the
  queue should never be reordered to drive a number to zero.

## Workouts

- **Workouts run server-side against the real toolchain.** A browser sandbox cannot run a real ORM,
  which defeats the purpose. Each workspace symlinks its `node_modules` at `packages/workouts`, so a
  workout imports the real drizzle-orm with no install per attempt and no network.

- **A workout declares its stack as free text in the manifest.** That is what lets the same brief
  ship against four different ORMs as four separate workouts, which is the case the format exists
  for.

- **Checkpoints are one test file each and are not gated on each other.** Status is "did every
  assertion in that file pass", which is what makes a 20-minute exercise honest: at ten minutes, two
  of four green tells you something real. A strict mode that gates later checkpoints on earlier ones
  has been raised and not taken.

- **A brief states the symptom and never the cause.** Working out what is wrong is the exercise, so
  naming the diagnosis deletes the part worth doing. It is the easiest mistake to make, because by
  the time you write the brief you know the answer.

- **A single-checkpoint run says what it did not check, rather than quietly keeping the old ticks.**
  Running one suite while iterating on it is the point of the feature, and the trap is what happens to
  the other three rows in the panel. Blanking them to not-run throws away the picture you were working
  from; leaving them green claims a verification nobody performed, which is the one lie a checkpoint
  panel cannot afford. So they carry their previous result forward with `stale` set, dimmed, captioned
  "Not re-run just now", and two numbers refuse to count them: `passedCount` only counts what the run
  itself verified, so a one-checkpoint run can never raise your best score, and the reference unlocks
  only on a full green run of the whole suite. That last rule is why `WorkoutRun` records which
  checkpoint it ran rather than inferring it from the counts.

- **The two systems workouts stayed two.** They were queued with permission to merge if writing them
  proved they were one, and they are not: a circuit breaker is a state machine over failures, and
  single-flight is deduplication over concurrency. They share a fake clock and nothing else. The
  overlap that remains is with the queued "Cache the expensive report", which is cache-aside in an
  Express handler; the dedupe primitive underneath it is now `one-recompute-not-fifty`, so that
  workout is about where the pattern goes wrong around a route rather than about the primitive.

- **A checkpoint never waits out the suite timeout to learn a call is stuck.** Both clock-driven
  workouts assert on "has this settled by now" through a helper that races the call against a few
  macrotask ticks. Without it, a starter that never times out anything spends ten seconds per
  assertion, and a 25-minute exercise pays half a minute for every run of its checkpoints.

- **Performance is judged by what the code asked the database for, never by a stopwatch.** A timed
  assertion would be flaky. Asserting on statement counts, rows returned and the `EXPLAIN` of the
  query actually sent makes the failure message the teaching, and it separates an index that exists
  from an index the planner chooses, which is the distinction the exercise is about.

- **Fakes keep the awkward semantics of the real thing.** The fake Redis is worth having because
  `incr` creates a key with no deadline, and because `ttl` answers -1 for "no deadline" against -2
  for "no key". A fake that smoothed those over would teach an API that does not exist.

- **Anything time-dependent gets a fake clock rather than vitest's fake timers**, which fight
  supertest's sockets and `userEvent`. The fake Redis carries an `advanceTime` the real thing has
  not, which is how a checkpoint waits out a sixty-second window for free.

- **The offline constraint forced three substitutions, and all three improved the exercise.** A
  local fixture endpoint replaced a public JSON API and gained fault injection and a per-query
  delay, which is what turns a race into something a checkpoint can assert on. PGlite replaced
  Postgres and gives real `ILIKE` and real `EXPLAIN` in-process. The Redis fake replaced Redis.

- **The scaffold's server project transforms with SWC, not esbuild.** Nest and TypeORM read
  constructor parameter types back at runtime through `design:paramtypes`, and esbuild emits no
  decorator metadata at all, so injection silently resolves to `undefined`. The failure is a
  confusing null rather than a build error. The client project stays on esbuild, which is faster and
  needs none of it.

- **The scaffold picks a test environment with two vitest projects, not `environmentMatchGlobs`**,
  which vitest deprecated in 3.2.

- **Prisma is not a workout stack.** `prisma generate` is a build step in a package that
  deliberately has none, and there is no PGlite driver adapter for it, so one would have to be
  written against Prisma's adapter API. Both are solvable and neither is worth it for one workout.
  TypeORM and Sequelize connect without codegen.

- **Mongo and Mongoose are deferred.** They need a real server or a heavyweight memory-server
  dependency, and no brief so far demands a document store. Revisit if one genuinely does.

- **A GraphQL server workout was deferred until the transport pages existed**, so its brief would
  have somewhere to link. The N+1 that GraphQL invites makes a good bug-hunt, and the dependency is
  now in place.

- **React Native and desktop workouts are refused.** Web is the stated priority, and the platform
  cannot checkpoint native targets. That machinery does not get grown speculatively.

- **New dependencies are raised as a batch and taken as decisions.** `graphql`, `react-window` and
  `zustand` were decided together rather than one at a time, precisely so the question got answered
  once. A dependency is the one part of a workout that is not just a directory, so adding one stays
  a decision rather than a reflex.

- **Shared workout helpers wait until the variation is visible.** Two workouts each log the
  statements their ORM runs, and the shapes differ enough that folding them into one helper at n=2
  would be guessing. Anything shared has to live in `scaffold/`, which is copied into every
  workspace, so it becomes part of the authoring contract rather than an implementation detail. The
  same reasoning holds back a `pnpm workout <slug>` generator.

- **Workspaces are disposable.** The directory for an attempt is deleted when the attempt finishes,
  and anything worth keeping goes in the database.

- **Easy workouts are their own shape, not shortened medium ones.** The library reached ten workouts
  with nothing under twenty minutes, so nothing fitted the session the rest of the app is built
  around and the whole content type sat behind a wall. A medium workout asks you to build a thing;
  an easy one asks you to get one thing right.

## The handbook

- **Pages are markdown that reads fine on GitHub.** The repo is public and that reach costs nothing.
  The app adds what GitHub cannot: section navigation, and practise links resolved to live problems
  and workouts.

- **The systems section teaches concepts before case studies.** You fail a system design
  conversation on fundamentals, not on not having read enough architectures. The case-study shelf
  hangs off the section as further reading rather than as pages.

- **Interactive diagrams are deferred.** A diagram you can drag a node around in is application code
  per diagram, which breaks the rule the whole library rests on. Revisit only if a specific concept
  proves it cannot be taught any other way, and then build that one thing rather than a framework
  for it.

- **Fenced ASCII is the floor for diagrams and Mermaid is the step up, and the dependency is the
  decision.** Mermaid keeps a diagram as diffable text and renders on GitHub, at the cost of a
  not-small dependency in the app bundle rather than in a workout workspace. Committed SVG needs no
  dependency and gives up diffability and easy authoring; ASCII needs nothing at all and caps what
  can be drawn.

- **Pages say which engine they mean.** The source material teaches Postgres and devgym runs SQLite
  and PGlite, so a page names its engine and notes where SQLite differs. This is not pedantry:
  writing the SQL section against `practice.db` rather than from memory contradicted three claims
  that would otherwise have shipped as fact, including that SQLite accepts a select-list alias in
  `WHERE` where Postgres refuses, and silently resolves it to the table column when the alias
  shadows one.

- **Databases and writing SQL are two sections on purpose.** Databases is where a query goes wrong:
  indexes, plans, N+1 and pagination, all of which assume you can already write the query being made
  slow. Writing SQL is where the query gets written.

- **Reading order is the reader's order, not the build order.** The section manifest owns what a
  reader sees, which is why writing SQL sits before databases (writing a query comes before making
  it fast) and security sits directly after headers.

- **Some pages keep no easy problem behind them, and that is a refusal rather than debt.** An easy
  rep is a real thing met in ordinary feature work, answered in under two minutes by someone who has
  just read the page. Back-of-envelope estimation is performed out loud, consistent hashing is
  consumed rather than configured, and a rep written to fill the row would teach that the
  definition was the point.

- **The easy-rep bar is deliberately not enforced mechanically.** "Has an easy problem" is checkable
  and would be the wrong thing to check, because passing it by writing trivia is easier than passing
  it honestly.

- **No page-level progress tracking, no streaks, no completion states.** Problems and workouts
  measure progress; pages are reference.

- **No search until the page count demands it.** The section list and the practise links are how you
  arrive at a page, and search would be machinery ahead of the need.

- **Not a wiki, not exhaustive, and never a mirror of someone else's course.** Exhaustiveness is the
  failure mode that turns reference into something nobody opens.

- **Testing is deferred, and its threshold is written down so it stays a decision rather than an
  oversight.** Its problems are a small cluster, all about testing-library and React, which is the
  thinnest case in the library. It earns a section when the category grows past the JavaScript
  section's size, or when a workout's checkpoints are about the tests themselves, whichever lands
  first.

- **Deliberately absent: mobile and desktop, machine learning proper, a Python workout runtime.**
  Web is the stated priority, so React Native and Flutter wait until the web map is substantially
  built. Shipping against a model is web work and has a section; training one is not. FastAPI earns
  one comparison page, because seeing a third framework name the same seams is what makes them
  visible as seams, but a FastAPI workout would put a Python runtime in the workout runner, which is
  a far larger decision than a dependency line.

- **TypeScript and data structures both left "deliberately absent", and the rule those reversals
  produced matters more than either.** TypeScript was excluded because the source material was thin,
  and DSA
  because patterns are better practised than read. Both came back when practice volume said so: the
  problem set now reaches conditional types, `infer` and assertion functions, and choosing between
  an array, an object, a `Map` and a `Set` is a decision made in ordinary feature work that nothing
  explained. **The general rule: the original arguments were about source material and the pairing
  rule is about the reader, and the reader wins.** Anything else in "deliberately absent" stays
  absent until its practice volume says otherwise. Note that the reversal on DSA is narrow: the
  patterns themselves stay in `dsa-patterns` as graded implementations, because a page about sliding
  window teaches less than three of those.

- **"Nothing to practise" is a reason to write reps, not a reason to defer a page.** The B-tree page
  was deferred on exactly that ground and the deferral was reversed the same day, which is the more
  useful half of the story. The gap was real and measured: the term appeared six times across
  `databases`, `sql` and `ai-engineering` and was defined nowhere, while
  `databases/how-an-index-gets-used.md` taught a sorted-array model that carries selectivity,
  leftmost prefix and `ORDER BY` elimination without ever saying how the start of a range gets found
  without scanning to it. The blocker was the one mapping this project enforces, that a page names
  somewhere to practise it. But the reps were missing rather than impossible, and writing ten of them
  cost less than waiting for `sql-performance`. The same reversal shipped `databases/search-past-like.md`,
  which answers a question `how-an-index-gets-used.md` had been raising and handing to nobody.
  **The rule to carry forward: defer a page when the material cannot be verified or when the reader
  would not notice its absence, not when the practice behind it merely has not been written yet.**

- **Index reps cannot be `sql` reps, and that constraint is load-bearing.** The SQL practice database
  carries no indexes on purpose, so a live query can never demonstrate one being used. Everything
  about index behaviour and full-text search is therefore authored as `short-text` and `explain`
  against output captured from a real engine, which is the same shape `sql-performance` will need.
  The engine is PGlite, which is real PostgreSQL, so the captured plans are measured rather than
  recalled. Two claims died in that process: a rep asserted that a composite index falls back to a
  sequential scan when the leading column has high cardinality, and it does not, it reads the whole
  index and reports `Index Searches: 1`; and a page and its rep disagreed about how many lexemes
  `to_tsvector` returns for one sentence. Both were caught by re-running rather than by review.

- **AI engineering is in scope, and the scope moved once, deliberately.** What a web engineer is
  asked to build now includes an endpoint that streams tokens and a tool server another program
  drives. That is web engineering with an unfamiliar dependency on the end of it, and it fails in
  web-engineering ways: timeouts, backpressure, idempotency, cost per request. Training and model
  architectures stay out.

- **Security covers what a web engineer builds and reviews, not offensive security.** No
  exploitation technique gets a page it does not need for the defence to make sense.

- **An API is a module, not a page.** The query-params and dates categories were both carried as
  handbook debt until it became clear the handbook was never their home. Repeated keys, `set`
  against `append` and the plus-sign space trap are the edges of one API met one at a time, not a
  mental model to explain. A model is a page; an API is a module.

## The essentials path

- **It is a second entrance, not a setting on the daily session.** Everything else here is judged
  against a 15-minute morning, and the path is deliberately not: it is the weekend-or-evening mode.
  The morning queue stays interleaved and spaced because that is what retention wants; an hour on
  the path is blocked and ordered because that is what building a model the first time wants. Making
  either one a mode of the other would blur two jobs that are correct at different stages.

- **Where you left off is derived from the reps, and nothing is stored.** A step whose problem is
  solved is done, and the first step that is not done is where you are. That keeps page-level
  completion a standing non-goal, and it means the feature shipped with no schema change and no
  migration. If a path ever wants its own progress model, that is the signal it has drifted from
  being an ordering into being a second app.

- **The subset rule is enforced mechanically, because it is the one that will get broken.** The path
  is a recommendation, and a recommendation that eventually names every page is an index. Good
  intentions do not survive seven more sessions, so `paths.spec.ts` fails if the sessions between
  them cite three quarters of the handbook. The number is a tripwire rather than a target: it should
  fire as a conversation about what to cut, long before anyone notices the path has stopped
  recommending anything.

- **Read, then prove, then build is enforced by the loader, not left to authors.** The reps come
  after the pages that explain them, which is the exact opposite of the daily queue's job, and it is
  the only structural rule the format has. A rule that is the whole point of a format is worth a
  check rather than a sentence in a README.

- **Seven hours shipped, and the test the path was meant to run for modules came back split.** The
  async hour was built entirely from existing pages and reps, without once wanting to teach an API
  from scratch, which by the stated criterion is evidence that the `promises` module matters less
  than assumed. But `query-params` and `dates`, the two areas the module list targets hardest,
  produced no candidate hour at all: twenty reps between them and nothing to read first, so there is
  no read step to write. An API with no model to explain does not become an hour, and that is the
  module spec earning itself. Note which direction the evidence can run: authoring the path can
  demote a module, never promote one, because a slice that fits an hour is model-shaped by
  construction.

- **A session with no fitting workout is 45 minutes, not an hour padded with one.** Two of the seven
  end on reps, because reaching for a workout that half-fits would cost the hour its coherence and
  teach the wrong lesson about what the path is for.

- **The reading reps are not a session, and reading is not a category.** Twelve reps that hand you
  unfamiliar code and ask what it does now sit in the categories their snippets belong to, and the
  obvious next move, an hour on the path, does not survive the format's own rules. A session is named
  by the question its hour answers, and "what does this code do" is a posture rather than a slice of
  the work. There is nothing to read first, because reading is a skill rather than a model several
  reps share, so the read step could only be padded with pages about whatever the snippets happen to
  touch. The order would carry no meaning either, since no reading rep builds on the one before it.
  What is missing is an entrance rather than an ordering, and that is application code: roadmap §1.

- **The reader sees "Essentials"; the code says "path".** The route is `/essentials` because that is
  what the thing is to someone deciding how to spend an hour, and everything behind it, the package,
  the API and the types, is `path`, because that is the word the spec and the docs use. One
  translation, at the boundary, written down here so it is a decision rather than a drift.

## Modules

- **Modules and the essentials path stay separate, and the reason is what you arrive knowing.**
  They look alike from outside: both are guided sequences longer than one rep, both need a route, and
  both refuse progress tracking. But a path is assembled from pages, reps and workouts, and all three
  assume you already know the thing. A module is the only format for the API you use constantly and
  understand shallowly. Merging them would mean either the path starts authoring material, at which
  point it no longer just orders what exists, or modules lose their steps and become a page plus reps,
  which the handbook already is. They differ on every axis that matters: 15 to 25 minutes on one API
  against an hour across a slice, and creating content against ordering it.
- **What they do share is machinery, and that gets consolidated instead.** One sequence viewer, where
  a module is a sequence of predict-run-correct steps and a session is a sequence of steps that may be
  pages, reps, workouts or a whole module. The shared non-goal is stated once: neither introduces
  progress tracking.
- **The path shipped first, and was the test of how many modules are needed.** It adds no content;
  modules are eight of them at 10 to 20 authored steps each, plus a content type and app code. What
  the test returned is recorded above: the async hour worked from existing pages and reps, and
  `query-params` and `dates` produced no hour at all. Read the module list with that in mind rather
  than as eight equal entries.

- **The format shipped as specified, and the two rules experience added are in `content.md`.**
  Building `js-date` found both: assertions run on the reader's machine with no fake clock and no
  fixed timezone, so a module that depends on its author's zone is broken for everybody else; and a
  step's assertions are about the API rather than about the reader's edit, which is what makes the
  snippet safe to change and explore. Neither was in the spec, and neither is discoverable from a
  module that happens to have been written in UTC.

- **The run endpoint takes the code and looks the assertions up itself.** The client sends what is in
  the editor; the assertions come from the step on disk. That is the split the format needs: the
  snippet is yours to change and the check does not move when you change it.

- **A `module` step on the essentials path became legal the day modules existed**, which cost the one
  case in a switch it was reserved to cost. It counts as a read step, because it is what a session
  about an API has instead of a page.

- **A fourth content type was accepted even though it costs application code.** The other three all
  assume you already know the thing you are practising. The gap they miss is the handful of APIs
  used constantly and understood shallowly, where the problem is not being stuck but holding a wrong
  model that has never cost enough to notice. Predicting, running and being corrected is what fixes
  that, and no existing format does it.

- **A step that cannot pose a question with a definite answer is a handbook page and belongs
  there.** That is the whole boundary between the two formats, and it is what stops a module turning
  into prose with a run button.

- **Module code lives in tagged fences, not in frontmatter.** The handbook's YAML parser takes
  strings, lists of strings and lists of flat objects, and teaching it block scalars so it could
  hold source would be the wrong trade. A tagged fence is already valid markdown and renders on
  GitHub.

- **Modules get no progress tracking and do not touch the review ladder.** The problems are the
  progress tracking, as with pages. A wrong prediction is exactly the signal the ladder wants, which
  makes wiring it in worth revisiting with real data and a migration rather than building
  speculatively.

- **Not a course platform.** No enrolment, no certificates, no percentage complete, no streaks, no
  video or audio. No branching either: steps are linear, and a module that needs a decision tree is
  two modules.

## Navigation, and what the first page asks

- **The nav carries four entries and none of them is a content format.** It had grown to nine, one
  per format plus the dashboard, which is what a nav does when every shipped thing is added to it:
  a morning opened on nine choices, of which one was the one worth making. The four are the four
  questions somebody actually arrives with. Today is what to do now, Library is where everything is,
  Handbook is what to read, Progress is how it is going. The rule that keeps it at four is that a
  new format earns a slot only by being a different question, and no format has been.

- **Today asks one thing, and it starts the session rather than linking to a page that asks more.**
  The old dashboard led with a scoreboard and put the session behind a card that then wanted a size,
  a category and a difficulty before anything began. That is three decisions and a report in front of
  fifteen minutes. The scoped form still exists on `/session` for when the scoping is the point; it
  is the second button, not the first.

- **The other formats are ranked by what they cost you, not by what they are.** On a morning the
  question is never "module or workout", it is how long there is, so each tile carries the duration
  the content itself declares and nothing rounds or estimates. Cards show a count instead, because a
  run has no authored length and inventing one would be the first invented number in the app.

- **Progress is a page you visit, not a page you land on.** Every number that was on the dashboard is
  still there and several that were computed and never shown now are, including the difficulty split.
  Moving them was the point: coverage is worth reading weekly and is worth nothing at the moment you
  sit down to work, and a reset button belongs nowhere near a page opened every morning.

- **The library is one page with tabs, and the list routes moved into it.** `/problems`,
  `/workouts`, `/modules` and `/essentials` redirect to their tab; the detail routes keep their
  top-level URLs, because a link to a workout is the workout and not a position in a browse surface.
  A menu of menus was the alternative and is what a library page usually degrades into: this one
  shows the content, and each tab is one click from the others rather than one click from an index.

- **Cards are not a library tab.** There is nothing to list, since choosing a deck was refused for
  the reason in the next section, so cards stay an entrance on Today. This is the same rule the decks
  decision made, applied to the page that would otherwise quietly reintroduce the choice.

## Decks

- **Decks are never surfaced in the UI, and the reason is the count of entrances rather than
  anything about decks.** The app already offers problems, essentials, the handbook, workouts and
  modules. Landing on a list of decks would put a second decision in front of someone with fifteen
  minutes, before they have answered anything. So `/cards` is the run itself, over every card there
  is, and the deck survives as the authoring unit and the thing that anchors a card to the page it is
  checked against. This finishes the translation the next entry starts: the reader does not see the
  word "deck" at all. Two consequences worth knowing. Shuffling stopped being optional, because one
  pile in file order opens on the same card every morning, and the summary has to credit pages and
  reps across whichever decks a run happened to deal from. The run is the whole library today, which
  is a few minutes; somewhere past a few hundred cards it stops being a sitting, and bounding it is a
  real change to make then rather than now.

- **Cards are self-graded.** You flip, you say whether you had it, and the app takes your word.
  Reusing the `short-text` matcher was considered and declined: free recall of a phrase is exactly
  where a matcher is wrong often enough to matter, and being marked wrong on an answer you knew is
  the fastest way to stop opening a deck. Auto-grading is not foreclosed by this. A deck whose
  answers really are single strings could take one optional field per card later, and nothing about
  the format stands in the way.

- **v1 persists nothing: no table, no migration, no write path.** The reps a deck cites are the
  progress tracking, as they are for modules and pages. The binding precedent is in the section
  above: modules get no progress tracking and do not touch the review ladder, and wiring the ladder
  in waits for real data and a migration rather than being built speculatively. A self-graded card is
  a weaker signal than a failed module prediction, so if modules wait, cards do not skip the queue.
  Revisit when a deck has been in use for a few weeks and its owner can either name the cards they
  keep missing or is annoyed that the app cannot.

- **A deck is one JSON file, not one markdown file per card.** A module step is prose plus a runnable
  snippet and genuinely needs a file; a card is two sentences, and eight files with frontmatter for
  sixteen lines of text is ceremony. The size caps then do authorial work rather than merely bounding
  a field: a back that does not fit on one line is a card that has become a page, and the page is
  already cited.

- **The reader sees "Cards"; the code, the package and the API say "deck".** The same boundary
  translation as Essentials and `path`, for the same reason. "Cards" is what the thing is to someone
  deciding how to spend ten minutes, and "deck" is the word the content and the types use.

- **The suite cannot check whether a card is true, and the format is built around that gap.** A
  module's assertions run against its own snippet, so a module that teaches something untrue fails
  the build. A card has nothing to run. That is why `page` and `sources` are required rather than
  optional, and why the review rule is that every claim on a card must be checkable against the page
  it cites.

## Grading and safety

- **The expected result is executed at grade time, never stored.** Storing expected rows would make
  grading quietly wrong the moment the seed data changed, and the seed data is meant to keep
  changing.

- **SQL answers compare raw row values, so column names and aliases never matter.** Column count
  does, numbers compare numerically and everything else by string equality. The exercise is the
  query, and failing someone for naming a column differently would grade the wrong thing.

- **The practice dataset is literal and deterministic, and its shape is a requirement.** No
  randomness, because stable data makes debugging sane. Constraints on the values themselves, such
  as distinct prices where a problem asks for the most expensive rows, are what give a question
  exactly one right answer.

- **User SQL runs against `practice.db` opened readonly, and `ATTACH` is refused**, so `app.db` is
  unreachable from an answer. This is the one boundary in the app that is real rather than
  conventional, and it stays that way.

- **`node:vm` in the code runner is an isolation convenience, not a security boundary.** Determined
  code reaches the host realm through constructor chains. That is acceptable because devgym runs
  locally and executes only code the user typed, which is the same trust level as `pnpm dev`. Do not
  reuse `grading/code-runner.ts` to run code from anyone else.

- **The workout workspace is not a security boundary either.** The path-escape guards exist to catch
  mistakes, not attackers.

- **The solution is held back until the problem is solved or three attempts have gone in**, and
  revealing it marks the problem skipped rather than solved. Answering before you see the answer is
  the mechanism, and a reveal that cost nothing would remove it. Checkpoint hints appear only after
  that checkpoint has failed, for the same reason.

## Attribution and sources

- **Every handbook page cites at least one source, enforced in `pnpm verify`.** The material traces
  to other people's teaching, and some of it traces to nothing at all: machine-written guides, and
  years of shortlinks with the original authors stripped off. Republishing that silently would take
  credit the project has not earned, so the fix is structural rather than a matter of good
  intentions.

- **Paywalled sources shape a page and never carry a claim.** A paid course gets credited for the
  material it shaped, but every claim has to be checkable against an open reference, and a claim
  with no open reference does not ship. In use this went one step further: paywalled courses ended
  up not credited on pages at all, because no claim ever rested on one.

- **LLM-generated source material does not count as a source.** Pages built from a machine-written
  guide verify each claim against primary references and cite those. The note itself is never the
  citation, however useful it was to write from.

- **No link shorteners, ever.** A shortlink is resolved to its canonical target before it can be
  cited, and if it is dead or its author cannot be identified, the claim is re-sourced or dropped.
  Links rot faster than expected: two of the learning-techniques citations had already gone by the
  time they were checked, which is why every paper citation carries its DOI in plain text.

- **The about page says plainly that the content is largely machine-written and reviewed
  progressively.** The test suite guarantees that every canonical answer grades correctly and every
  workout solution passes its checkpoints. It cannot guarantee that an explanation or a page is
  true, and implying otherwise would be the same failure the citation policy exists to prevent. This
  is why accuracy is a writing rule and not only a research one.

- **Claims about the app get checked against the file that implements them.** Writing the
  learning-techniques page contradicted several descriptions of the app that had read as harmless
  summaries. The review ladder does not widen on any correct answer and reset on any wrong one: it
  widens only on a review of a problem already solved, resets only when a review is failed, and does
  nothing to a problem never solved. Interleaving is not in the queue builder at all; the
  round-robin across categories is baked into `position` at seed time.

- **Expanding review intervals are not evidence-based, and the project says so.** Spacing has the
  evidence, the expanding shape is a choice, and the 1, 3, 7, 21, 60 ladder is a guess. Karpicke and
  Roediger tested expanding intervals against equally spaced ones and found expanding better ten
  minutes after learning and worse two days later, which is the direction that matters for a review
  schedule; Cepeda et al. add that the best gap depends on how long you want to retain the material,
  which a fixed ladder ignores. This one is worth guarding, because the temptation to reassert it
  recurs: conceding the numbers while borrowing authority for the shape is the subtler version of
  the thing the about page exists to avoid.

## Open-sourcing

- **The repo is public and MIT licensed, prose included.** One licence is simpler than two, and the
  crediting culture this project cares about lives in the citation policy rather than in licence
  text.

- **No CLA and no governance apparatus.** It is a personal project that accepts patches.

- **No hosted docs site.** The app and the repo are the artifacts.

- **The about and learning-techniques pages are hand-written React, not content.** They are two
  pages; a content pipeline for them would be machinery for its own sake.

- **Self-hosting was raised and declined.** The workout runner executes submitted code and `node:vm`
  is not a security boundary, which is fine on a laptop and a different proposition on a box with a
  public interface. Making it safe means real sandboxing, which is a project rather than a
  deployment, so devgym is not exposed on a network interface. If self-hosting returns it returns
  split: the read-only half has no code execution, no accounts and no user data, so publishing it is
  a static build and nothing more, while the full app stays local or behind a private network. What
  does not happen is the whole thing on a public interface because the handbook wanted a URL.
