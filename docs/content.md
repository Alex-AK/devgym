# Writing content

devgym has four content types: problems, handbook pages, workouts and modules. This is the bar each
one clears and how to write one. Read the section for the type you are adding, then the
cross-cutting rules at the end, which apply to all four.

A fifth kind of file authors nothing and orders what the four produce: a session on the essentials
path. Its section is below, and its bar is different because its material is already written.

What this file does not cover: `WRITING.md` owns the prose and is not optional reading, `CLAUDE.md`
owns the commands and the constraints of the codebase, `docs/decisions.md` owns why a rule is the
way it is, and `docs/roadmap.md` owns what is not written yet.

Content is a directory or a seed-file entry, never application code. If adding a piece of content
needs an application change, that is a bug in the design and worth saying out loud before you work
around it.

## Problems

A problem is one rep. Sixty to ninety seconds, answered by someone who already knows the concept,
scheduled by the review ladder. It measures recall.

### Where it lives

Content is `apps/server/src/seed/problems/<category>.ts`, one file per category. Problems upsert by
slug, so editing one updates it in place and keeps its attempt history. `position` is generated in
`problems.seed.ts` at seed time, never authored. Run `pnpm seed` after editing: boot only auto-seeds
an empty database.

A category is a member of `CATEGORIES` in `packages/shared/src/index.ts` with a label in
`CATEGORY_LABELS` and a seed file of its own. Adding one is those three things and nothing else.

### The two axes

`difficulty` is how hard the answer is. `relevance` is how often the knowledge comes up, and they
are independent:

- `daily` — you write this in ordinary feature work.
- `occasional` — it comes up in a bug, a perf pass, an edge case.
- `foundational` — you meet it through a framework more often than you write it.

Author `relevance` honestly. A hard problem can be daily bread and an easy one can be pure trivia,
and the label is what lets a 15-minute session be judged on what it is actually teaching.
`foundational` is not an insult.

**An easy problem is a real thing met in ordinary feature work, answered in under two minutes by
someone who has just read the page.** A definition to recall is not one. If the only easy rep you
can think of for a topic is "what is this called", the topic has no easy rep, and writing the card
anyway teaches that the definition was the point.

### Picking a grader

Four types, and the choice is made by what the answer is, not by the topic:

- **`sql`** — the answer is a query. Config is `{ solutionSql, orderMatters, hints }`. Expected rows
  are produced by running `solutionSql` at grade time against `practice.db`, so the dataset can grow
  without invalidating anything. Rows compare by value rather than by column name, so aliases never
  matter. Set `orderMatters` only when the prompt asks for an order; when it is set, right rows in
  the wrong order grade `close`.
- **`short-text`** — the answer is a name or a one-line expression. Config is
  `{ accept, acceptPatterns?, nearMisses?, closeSubstrings?, hints }`. Both sides are normalised
  (case, whitespace, wrapping quotes and backticks, trailing punctuation), and accept strings of six
  characters or more get typo tolerance for free. Use `acceptPatterns` when the shape matters more
  than the exact text.
- **`explain`** — the answer is a sentence or two. Config is
  `{ groups: [{ synonyms, missingFeedback }], hints }`. A group matches when any synonym appears in
  the normalised answer; all groups is `correct`, half is `close`. Each group is one idea you
  require, so three groups is the practical ceiling.
- **`js-code`** — the answer is a function. Config is `{ setup?, starter, tests, hints }`.

**Name the obvious wrong answer.** `nearMisses` and `closeSubstrings` map a specific wrong answer to
specific feedback and grade it `close`, which is where most of the teaching in a short-text problem
actually happens. `filter` when the answer is `find` deserves a sentence, not a red banner.

Hints are ordered mildest to strongest, and one more is revealed on each failed attempt, so hint one
should not name the answer. `pnpm grade <slug> "<answer>"` prints the verdict alongside the exact
config it was measured against, which is the fastest way to find out whether a grader is too strict.

### js-code specifics

**A test takes an `expression`, not statements.** It is evaluated after the submission runs, so
multi-step setup has to be wrapped in an IIFE. A test is
`{ name, expression, expected | expectedCode | throws }`:

- `expected` is deep-compared and has to be JSON-serialisable.
- `expectedCode` is an expression, for the values JSON cannot hold: `undefined`, `NaN`, a `Map`.
- `throws` matches a substring of the thrown message.

`name` is shown to the user, so phrase it as the behaviour being checked. `starter` is prefilled
into the editor and must carry the signature, so the name the tests call is the name the user sees.
The reference implementation doubles as the canonical answer and the displayed solution, which is
what stops those two drifting apart.

### The rest of a problem

`prompt` is markdown and states the task. `solution` is the canonical answer as a user would type
it. `explanation` is the lesson, read in the thirty seconds after solving, and it carries the
teaching on its own: most reps need nothing behind them at all. Two to five sentences of why, not a
restatement of the prompt.

### What the suite enforces

Every canonical answer grades `correct`, every declared near-miss grades `close`, every
`acceptPattern` compiles, no keyword synonym normalises to an empty string, and every coding
problem's reference passes its own tests while its starter does not. That is what makes problem
content safe to edit in volume, and it runs in `pnpm verify`.

## Handbook pages

A page is not an article. It is what you would want open beside you while doing the workout.

### The shape

Five parts, fixed:

1. **The question it answers**, phrased the way you would ask it at the moment you needed it. "Why
   did my cache not invalidate" beats "Cache invalidation". This is the `question` field.
2. **The model** — what is actually happening, not the API surface. `## The model`.
3. **A worked example** you can read in under a minute. Real code, ideally lifted straight out of a
   workout so the two reinforce each other. `## Worked example`.
4. **The traps** — the two or three things that actually get got wrong, stated as symptoms first,
   because that is how you meet them. `## Traps`.
5. **Where to practise it** — the `practise` field, resolved by the app into links.

The three body headings are checked by exact text. Write whatever else you need around them.

**A page that cannot fill its traps section honestly does not get written.** If nothing goes wrong
in practice, the thing is a fact you would look up, and a fact you would look up is a problem, not a
page. What earns a page is the model that several reps share, where getting that model wrong is what
makes all of them fail.

### Where it lives

`packages/handbook/content/<section>/<slug>.md`, alongside a `section.json` carrying the section's
`slug`, `title`, `summary` and `order`. The server reads the directory per request, so a new page
needs no restart. Pages are written to read fine as plain markdown on GitHub; the app adds section
navigation and resolves the `practise` links.

Frontmatter:

- `title` and `question`.
- `order` places the page in its section. Pages without one sort last.
- `practise` takes problem and workout slugs, mixed. Every one must resolve.
- `sources` takes an author, a title and a canonical URL each. At least one, always.
- `verified` is the date, `YYYY-MM-DD`, the page's claims were last checked against those sources.
  It is shown on the page. Move it when you have actually rechecked, not when you touch the file.

The frontmatter parser takes a small YAML subset: strings, lists of strings, and lists of flat
objects. Quote a value containing a colon followed by a space.

### The safety net

`pnpm verify` refuses a page that cites nothing, cites through a link shortener, points `practise`
at a slug that does not exist, has an unparseable `verified` date, or is missing part of the shape.
The rest of the citation policy is review's job, and it is at the end of this file.

### Engine honesty

The pages teach Postgres in places; the app runs SQLite and PGlite. Say which engine a page means,
and note where SQLite differs (no `ILIKE`, different `EXPLAIN` output). **Run the query.** Numbers
and behaviours on a page about a language with an engine underneath are produced by running it
against `practice.db`, not recalled: three claims that would otherwise have shipped as fact were
wrong the first time this rule was applied.

### Diagrams

Some material is a diagram or it is nothing. **Fenced ASCII is the floor**, it costs nothing, and it
works better than it sounds. Anything richer is a dependency decision that lands in the app bundle,
so it gets made deliberately and not inside a page. Interactive diagrams are out: a diagram you can
drag a node around in is application code per diagram, which breaks the rule the whole library rests
on.

### Before you write one

Grep `packages/handbook/content` first. Topic requests arrive as lists and a list does not know what
already exists; if a page covers the concept, the item is an edit to that page or it is nothing. A
page that covers the concept but never says the word someone came looking for is a real gap inside a
covered topic, and that earns its own page.

## Workouts

A workout is 12 to 25 minutes against a real toolchain: read a brief, edit real files, run
checkpoints, see how far you got. It measures execution under time.

### The shape

A directory under `packages/workouts/content/<slug>/`, and adding one touches no application source:

```
workout.json                 manifest
brief.md                     the task, written like a ticket
files/                       the starting project, what you edit
tests/checkpoints/*.test.ts  one suite per checkpoint, hidden from the editor
solution/                    the reference implementation of the editable files
```

The manifest carries `slug`, `title`, `kind` (`feature`, `bug-hunt` or `refactor`), `minutes`,
`difficulty`, `relevance`, `summary`, `focus`, `editable`, `checkpoints`, and a free-text `stack`
(`server`, `orm`, `database`, `client`). Stack is free text on purpose: the same brief can ship
against four ORMs as four workouts, and practising against a stack you do not know is the thing that
pays off.

A workout that needs a library the others do not use adds it to `packages/workouts/package.json`.
Each workspace symlinks its `node_modules` there, which is how a workout imports the real
drizzle-orm with no install and no network. That line is the one part of a workout that is not just
a directory, so adding it stays a decision rather than a reflex.

### Checkpoints

A checkpoint is one test file, and its status is "did every assertion in that file pass". That is
what makes an unfinished attempt worth something: at ten minutes you can see two of four green. Each
checkpoint has an `id`, a `title` phrased as the behaviour being checked, its `testFile`, and a
`hint` shown only after it fails.

Checkpoints are ordered but independent: checkpoint four can pass while one fails.

### The brief

**A brief states the symptom and the requirement, never the cause.** Working out what is wrong is
the exercise, and by the time you write the brief you know the answer, which is what makes this the
easiest mistake in the repo to make. It applies to `brief.md` and to the manifest's `summary`, which
is read first and leaks the answer most easily. `WRITING.md` has the worked before and after.

Three things stay explicit, because they are the task rather than the answer:

- **What must still be true when you are done.** Unchanged output, no new dependencies, the same
  API.
- **Anything unguessable about the environment.** A fake's odd semantics, where the query log is,
  what `advanceTime` does. Withholding local trivia is a scavenger hunt, not difficulty.
- **Checkpoint hints**, which appear only after that checkpoint has failed. That is the moment to be
  specific: name the one thing that is wrong.

### Two sizes

**Easy is a shape, not a smaller medium: twelve minutes, three checkpoints, one editable file, one
concept.** The starter compiles and runs, so the twelve minutes go on the lesson rather than on
wiring. A medium workout asks you to build a thing; an easy one asks you to get one thing right, and
runs twenty minutes or more.

**An easy workout still needs one checkpoint that cannot be patched locally**, or it teaches
nothing. Two symptoms that can each be fixed where they appear plus one that forces the actual fix
is the pattern that works.

**Check the scaffold for accidental help.** Express's built-in ETag handling would have handed over
two of three checkpoints in a conditional-requests workout for free; it is turned off, with a
comment saying why. Whatever the framework does helpfully by default is worth a minute of looking
before you trust a checkpoint.

### Judging behaviour, not wall-clock time

A timed assertion is flaky, so a performance workout asserts on what the code asked the database
for: statement counts, rows returned, and `EXPLAIN` of the query actually sent. That makes the
failure message the teaching ("one query came back with 40000 rows for a page of 20"), and it
distinguishes an index that exists from an index the planner chooses. Anything time-based gets a
fake clock the real dependency does not have, not vitest's fake timers, which fight supertest's
sockets and `userEvent`.

Nothing reaches the network, ever. Fixtures, in-repo fakes with the real surface and the awkward
semantics kept, and WASM databases. The awkward semantics are usually the lesson.

### What the suite enforces

`workouts.spec.ts` asserts every solution passes every checkpoint and every starter fails at least
one, and that every checkpoint has a distinct id and an existing suite. That is what makes workout
content as safe to edit as problem content.

## The essentials path

A session on the path is an hour on one slice of the work, and it authors nothing. It orders pages,
reps and workouts that already exist, which makes it the one kind of file here judged on selection
rather than on writing.

It is also the only thing in devgym not judged against a 15-minute morning session. That is the
point of it: the morning queue stays interleaved and spaced because that is what retention wants,
and a session here is blocked and ordered because that is what building a model the first time
wants. Both are correct, at different stages, and the app offers them as separate entrances rather
than making one a setting on the other.

### Where it lives

`packages/paths/content/<slug>/path.json`, one directory per session. The manifest carries `slug`,
`title`, `question`, `summary`, `order`, `minutes` and `steps`. A step is `{ kind, ref, note? }`,
where `kind` is `page`, `problem` or `workout` and `ref` is `section/slug` for a page and a bare slug
for anything else. A `module` step counts as a read step, because it is what a session about an API
has instead of a page.

### The shape of an hour

| Part  | Budget | What it is                                                    |
| ----- | ------ | ------------------------------------------------------------- |
| Read  | 20 min | Two or three handbook pages, in order, building on each other |
| Prove | 15 min | Six to ten reps drawn from those pages, in a fixed order      |
| Build | 20 min | One workout, where a fitting one exists                       |
| Slack | 5 min  | An hour that needs all sixty minutes is an hour that overruns |

A session without a workout is fine and spends the time on more reps. A session that cannot fill the
read step from existing pages is not ready to be written.

### The bar

- **The `question` is the test.** Name the session by the question the hour answers. A slice you
  cannot name that way is two sessions or none.
- **The path is a subset, deliberately and permanently.** Most content is not on it and never will
  be. The test for including a page: would leaving it out make the hour incoherent? Not "is it
  good", which everything here is meant to be. If every page eventually appears on some session, the
  path has become an index and has stopped being a recommendation. The suite fails at three quarters
  coverage so that this is a conversation rather than a surprise.
- **A session is one slice, not one section.** The most valuable ones cut across sections, because
  that is how the work does. "Why the page is slow" is a React page, a database page and an N+1 rep,
  and it is a better hour than anything wholly inside one section.
- **Order is fixed and meaningful**, and the loader enforces it: read, then prove, then build.
- **No new progress tracking.** Where you left off is derived from the reps, which carry their own
  progress. A session shows you that; it does not score you.

### What the suite enforces

`paths.spec.ts` refuses a session whose `ref` resolves to nothing, whose steps run out of order,
which has no page step or no problem step, which names a kind nobody has heard of, or whose `order`
collides with another session's. It is the same net that already checks a page's `practise` slugs resolve,
which is what makes an ordering safe to edit: content moves, and a stale reference fails the build
rather than the reader.

## Modules

A module is one sitting with one API: fifteen to twenty-five minutes, ordered steps, and at every
step you commit to an answer before the answer appears. The other three types assume you already
know the thing you are practising. A module is for the APIs you use constantly and understand
shallowly, where the problem is not that you are stuck but that your model is wrong in a way that
has never cost you enough to notice.

| Type    | Length    | You arrive            | It measures                     |
| ------- | --------- | --------------------- | ------------------------------- |
| Problem | 60-90s    | knowing the concept   | recall, on a schedule           |
| Workout | 25 min    | knowing the stack     | execution under time            |
| Page    | 3-4 min   | needing one answer    | nothing, deliberately           |
| Module  | 15-25 min | not really knowing it | whether you can predict the API |

### The step

Every step is predict, run, correct:

1. **Predict.** The step states a question with a definite answer and takes yours before running
   anything. Committing to a wrong answer is what makes the correction stick.
2. **Run.** Your code, or the step's code, through the grader devgym already has.
3. **Correct.** What actually happened, and the one sentence explaining why.

**A step that cannot pose a question with a definite answer is a handbook page, and belongs there.**

### Shape on disk

```
packages/modules/content/<slug>/
  module.json          title, summary, order, minutes, practise, sources, verified
  01-<step-slug>.md    steps, ordered by filename prefix
  02-<step-slug>.md
```

A step is markdown with `title` and `predict` in frontmatter and two tagged fences, ` ```js run `
and ` ```js assert `. Assertions are expressions evaluated after the snippet, exactly as `js-code`
problem tests are, and the IIFE rule carries over unchanged: **one assertion per line**, so anything
multi-step is wrapped in `(() => { ... })()` on a single line. The fences carry the code rather than
the frontmatter, because a tagged fence is already valid markdown and renders on GitHub. The loader
lifts both fences out of the body, so the prose never renders the snippet or the answer twice.

The numeric prefix orders the files and is not part of a step's identity, so renumbering a module
does not change anybody's links.

`practise`, `sources` and `verified` mean what they mean everywhere else, and the citation policy
applies unchanged.

The safety net mirrors the other two: every step's assertions pass against its own snippet, every
step has a predict question, every `practise` slug resolves, and every module cites something.

### Assertions run on someone else's machine

There is no fake clock and no fixed timezone behind the run button, so an assertion that depends on
the host's zone, locale or wall clock passes for its author and fails for the reader. Write ones that
hold anywhere: compare against `Date.UTC(...)`, state the relationship through `getTimezoneOffset()`,
name the zone explicitly in `Intl.DateTimeFormat`. `js-date` is the worked example and its assertions
were checked in five zones before it shipped.

Assertions are also about the API rather than about the reader's edit. They keep holding when the
snippet is changed, which is exactly what makes the snippet safe to play in: trying the next thing
that occurs to you is most of the value of the step being editable.

### The test that decides between a page and a module

**A model is a page. An API is a module.** `URL` and `URLSearchParams` is the worked example:
repeated keys, `set` against `append`, the plus-sign space trap, `encodeURIComponent` aimed at the
wrong thing. None of those is a mental model; they are the edges of one API met one at a time. So
**a category's pairing can be satisfied by a module**. An area is unexplained when nothing explains
it, not when no page explains it.

A module is also a legal step inside an essentials-path session, which is the only relationship the
two have, and it counts as a read step there: it is what a session about an API has instead of a
page. They share a viewer, not a purpose: a session sequences things that assume you already know
roughly where you are, and a module is the one format that does not assume it.

### Non-goals

Not a course platform: no enrolment, no percentage complete, no streaks on modules. Modules get no
progress tracking at all, for the same reason pages get none: the problems are the progress
tracking, and a module's `practise` list is how it shows up in your queue afterwards. No branching,
so a module that needs a decision tree is two modules. No video, no audio, no animation. And not a
replacement for the handbook: a module teaches an API from the beginning, a page answers one
question when you already know roughly where you are.

## Pairing

The library's halves do not run away from each other, and the rule has two directions:

- **Every page names somewhere to practise it.** Enforced: a page with an empty `practise` list
  fails `pnpm verify`. This is what stops the handbook becoming a wiki nobody opens.
- **Every area with real practice volume earns pages.** Not enforceable, and the direction that
  actually drifts. A category can grow to thirty problems while the concept behind them is written
  down nowhere.

**Not 1:1, deliberately.** A page can be served by problems from three categories, and one workout
can be the practical half of four pages. The target is that nothing is orphaned, not that the counts
match.

Two things pairing does not measure, both worth checking by hand. A section with pages and no
workout is reading that has never been tested under time pressure. And a page can be fully paired
and still offer nothing but the hard version, which is the on-ramp missing; see the easy-rep rule
above. Neither is mechanically enforced, and "has an easy problem" would be the wrong thing to
check, because passing it by writing trivia is easier than passing it honestly.

## What outranks pairing

The subject is practical knowledge for web engineering and AI engineering, judged against a
15-minute morning session. Content earns its place by being useful in that work, never by completing
a set, and completionism is the failure mode to watch for because it looks like diligence and is
easy to measure. An uncited problem is not debt, and a gap nobody would notice while working is not
a gap. Where a topic is genuinely not worth a page, say so and leave it, in the document that raised
it. `CLAUDE.md`, under "What it is for, and what that rules out", is the long version.

## Citing sources

The content draws on other people's teaching, and a lot of it is machine-written. The policy is
structural rather than a matter of good intentions, and `pnpm verify` enforces the mechanical half.

1. **Every page ends with a sources footnote**: author, title, canonical URL. At least one. "Common
   knowledge" still cites the official docs it was checked against.
2. **No link shorteners, ever.** `lnkd.in`, `bit.ly`, `t.co` and friends are rejected outright.
   Resolve a shortlink to its canonical target before citing it; if it is dead or the author cannot
   be identified, re-source the claim from a primary reference or drop it.
3. **Fetch every URL before it ships.** Links rot, certificates expire, and publishers move papers
   behind a paywall. Replace what does not resolve with a verified copy of the same work, and where
   a paper has a DOI, carry it in plain text so the citation survives its link.
4. **Name inspirations, reproduce nothing.** Where material traces to a course or a book, credit and
   link it, then write the page fresh in this project's own words. No course text, exercises or
   structure gets copied. Crediting generously and copying nothing are the same policy.
5. **Paywalled sources are inspiration, never the load-bearing citation.** A paid course gets credit
   for shaping the material, and every claim on the page must still be checkable against an open
   reference. If no open reference exists for a claim, the claim does not ship, and if nothing on
   the page rests on the course at all, it does not need to appear.
6. **LLM-generated source material is not a source.** Verify each claim against a primary reference
   and cite that. The note itself is never the citation.
7. **`verified` means what it says**: the date the claims were last checked against the sources
   listed. It is shown to the reader, so it is bookkeeping, not decoration.
8. **Problems and workouts credit when there is someone to credit.** Most reps are common material
   and need nothing; where one traces to a specific person's teaching, name them, in the workout's
   brief or the problem's explanation.

Sources are cited for the claim actually made, not for the general authority of the field. That is
the one rule of the eight most easily broken by accident.

## Voice

`WRITING.md`, in full, for everything a reader sees: prompts, hints, explanations, grader feedback,
briefs, checkpoint hints, pages, module steps and UI strings. It is short. The em-dash rules are the
ones that bite, and never bulk-regex dashes out of prose: it mangles dual-dash asides.
