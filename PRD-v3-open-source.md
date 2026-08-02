# devgym — PRD v3: open-sourcing honestly

> **Status: shipped.** The about page is live at `/about`, the citation policy is enforced in
> `pnpm verify` where it can be and stated in CONTRIBUTING where it cannot, and the README carries
> the authorship note. One deviation from the policy below, decided in use: paywalled courses are
> not credited on pages at all rather than credited as inspiration, since no claim ever rested on
> one. The repo is already public and MIT licensed. This document is
> about doing that honestly: crediting the people whose teaching the content draws on, and telling
> visitors plainly what this project is and how it was made. Siblings:
> [PRD-v3-learning-guide](./PRD-v3-learning-guide.md),
> [PRD-v3-content-roadmap](./PRD-v3-content-roadmap.md).

## Why

Two requirements sit above everything else in the v3 work, and they are both about honesty:

1. **Credit sources whenever they are available**, especially in the learning guide.
2. **An about page** that says what the project is for, what it owes to other people's teaching
   and to open source, and how it was written.

The guide is being built from a personal vault whose best material traces directly to other
people's work: _Just JavaScript_ (justjavascript.com, Dan Abramov), _Epic React_ (epicreact.dev,
Kent C. Dodds), Stephen Grider's NestJS Udemy course, all three confirmed; the Socket.IO
documentation; _Use The Index, Luke_. Some of it also traces to nothing at all: LLM-generated guides and years of
LinkedIn shortlinks with the original authors stripped off. A project that republishes that
without saying so would be taking credit it hasn't earned. The fix is cheap and structural, so it
goes in the spec rather than relying on good intentions.

## The citation policy

This is the policy the learning guide's safety net enforces mechanically where it can, and
content review enforces where it can't.

1. **Every handbook page ends with a sources footnote.** Author, title, canonical URL, rendered
   as a small footnote block at the bottom of the page. At least one source is required; "common
   knowledge" still cites the official docs it was checked against (MDN, react.dev, the Postgres
   docs). Enforced in `pnpm verify`.
2. **No link shorteners, ever.** `lnkd.in`, `bit.ly`, `buff.ly` and the like are rejected by the
   safety net. A shortlink from the vault gets resolved to its canonical target before it can be
   cited; if it is dead or the author can't be identified, the claim gets re-sourced from a
   primary reference or dropped.
3. **Name inspirations, don't reproduce them.** Where a page's material traces to a course or
   book, the source is named and linked even though the page is written fresh, in this project's
   own shape and words. No course text, exercises or paywalled structure is copied. Crediting
   generously and copying nothing are the same policy.
   **Paywalled sources are inspiration, never the load-bearing citation.** A paid course (Just
   JavaScript, Epic React, the Grider NestJS course) gets credited for shaping the material, but
   every claim on the page must be checkable against an open reference: official docs, a freely
   readable article. If no open reference exists for a claim, the claim doesn't ship.
4. **LLM-generated source material doesn't count as a source.** The vault's SQL guide is the
   live example: its body is machine-written, so pages built from it verify each claim against
   primary sources and cite those. The note itself is never the citation.
5. **Problems and workouts credit when there is someone to credit.** An optional `source` field
   on a problem, and a credits line in a workout's brief, for content that traces to a specific
   person's teaching (a Just JavaScript bug pattern, a Coding Challenges-style build). Optional
   because most reps are common material; present because some aren't.

## The about page

A static page at `/about`, linked from the dashboard and the README. Draft copy, written to be
shipped rather than rewritten:

---

### What this is

devgym is a practice gym for web-dev fundamentals: short daily problems, timed workouts against
real toolchains, and a handbook to study from. It runs entirely on your machine, fully offline.
Grading is deterministic; there is no AI anywhere in the loop at runtime.

It exists because of a simple worry: the more the day job leans on LLMs, the fewer reps the
fundamentals get. This is a place to keep doing them yourself: write the query, take the feedback,
build the thing under a timer. It started as one person's morning routine and is shared in case
it is useful to anyone else who wants to keep their practical skills sharp without AI assistance.

### What it owes to other people

Nearly everything. This project stands on open source software, freely shared writing, and the
work of people who teach: course authors, documentation writers, bloggers, and the maintainers of
every library in the lockfile. Where content draws on an identifiable source, it is cited in a
footnote on the page; if you find something that should be credited and isn't, please open an
issue, because that is a bug.

### How it was written

Largely by an LLM, and largely unreviewed. The test suite guarantees that every canonical answer
grades correctly and every workout solution passes its checkpoints; it cannot guarantee that an
explanation or a handbook page is true. Treat the prose here the way you would treat any
unreviewed technical writing: useful, probably right, worth checking against the cited sources
when it matters. Corrections are very welcome and easy to make; every piece of content is a small
file in the open repo.

### Credit

The only thing claimed as original here is the idea of consolidating all of this into one place
for deliberate practice. The knowledge belongs to the people cited on each page and to the wider
community that shared it. The mistakes, statistically speaking, belong to the LLM.

### Feedback

Issues and pull requests are welcome, for content errors above all. If a grader marked your
correct answer wrong, `pnpm grade <slug> "<answer>"` prints the diagnosis; paste it into an
issue and that is usually the whole report.

### How it tries to teach

Specified below as its own page at `/how-it-teaches`, linked from here rather than inlined, because
it is longer than a section and it is the one claim on this page that can be checked against
evidence.

### Colophon

Built on pnpm workspaces, Vite, React, TypeScript, Tailwind, shadcn/ui, NestJS, Drizzle,
better-sqlite3, PGlite, CodeMirror and Vitest, and each workout borrows a stack of its own
besides (Express, Kysely, TypeORM, jose and friends). Every one of these is somebody's freely
given work. Thank you.

---

The page is hand-written React in `apps/web/src/pages/AboutPage.tsx` (it is one page; a content
pipeline for it would be machinery for its own sake). The README gets a short "About and
credits" section linking to it, and the LLM-authorship disclaimer joins the README so it is
visible to people who never run the app.

## The learning-techniques page

**Shipped**, at `/how-it-teaches`, linked from the about page and the README. Hand-written React
alongside `AboutPage.tsx`, not a content pipeline.

The app leans on four techniques that have evidence behind them, and it had never said so anywhere.
That is a gap in the same direction as the LLM-authorship disclaimer: the honest move is to name the
mechanism, say where in the app it happens, cite the evidence, and be equally clear about the parts
that are guesses.

One short section each, and every one names the file or the constant so the claim is checkable:

- **Retrieval practice.** You answer before you see the answer. `REVEAL_AFTER_ATTEMPTS` holds the
  solution back until the problem is solved or three attempts have gone in, and workouts hold theirs
  until the checkpoints pass.
- **Spaced repetition.** `REVIEW_INTERVALS_DAYS` in `packages/shared`, the 1, 3, 7, 21, 60 ladder,
  stated outright because a reader deserves to know the schedule they are on.
- **Interleaving.** Consecutive problems come from different categories, and the page names where
  that happens.
- **Desirable difficulty.** Why the grader gives a verdict and a reason rather than the answer, why
  briefs state the symptom and never the cause, and why the checkpoint hint appears only after the
  checkpoint has failed. The friction is the mechanism.

### What writing it corrected

Every claim was checked against the file it names, and three of this document's own descriptions did
not survive that. All three failed the same way: the app does something narrower than the sentence
here said it did, which is worth recording because the sentences read as harmless summaries.

- **The ladder does not "widen on a correct answer and reset on a wrong one".** `nextSchedule` widens
  only on a review of a problem already solved, resets only when a **review** is failed, does nothing
  at all to a problem never solved, and caps at 60 days rather than falling off the end.
- **Interleaving is not in the queue builder.** The queue orders by `position`, and the round-robin
  across categories is baked into that position by `assignPositions` at seed time, inside each
  difficulty band. Scoping a session to one category turns it off, which the page says.
- **The predict step is not a thing yet.** Modules do not exist, so the retrieval-practice section
  rests on problems and workouts. Restore the reference when [PRD-v4](./PRD-v4-modules.md) lands.

### And the correction that matters most

This document conceded that 1, 3, 7, 21, 60 is a guess while asserting that **expanding intervals**
are evidence-based. That second half does not hold up. Karpicke and Roediger tested expanding
intervals against equally spaced ones and found expanding better 10 minutes after learning and worse
two days later, which is the direction that matters for a review schedule. Cepeda et al. add that the
best gap depends on how long you want to retain the material, which a fixed ladder ignores.

So the honest claim is narrower than the one planned here: **spacing has the evidence, the expanding
shape is a choice, and the five numbers are a guess.** The page says exactly that. Conceding the
numbers while borrowing authority for the shape would have been the subtler version of the thing this
page exists to avoid.

Sources follow the citation policy above with no exceptions: open references only, cited for the
claim actually made rather than for the general vibe of the field. Dunlosky et al. 2013 is the spine,
with Roediger and Karpicke on the testing effect, Cepeda et al. on distributed practice, Karpicke and
Roediger on expanding retrieval, and Bjork and Bjork on desirable difficulties.

**Two of the planned links had already rotted**, which is the rule proving itself again: Dunlosky is
no longer freely available at the publisher, and the Washington University copy of Roediger and
Karpicke serves an expired certificate. Both were replaced with verified institutional copies of the
same papers, and every citation carries its DOI in plain text so the paper survives its link.

## Repo touches

- `LICENSE` stays MIT for everything, prose included. One licence is simpler, and the crediting
  culture this document exists for lives in the citation policy, not in licence text.
- `README.md`: add the about-and-credits section; keep the existing contributing flow unchanged.
- `.github/CONTRIBUTING.md`: add the citation policy in one paragraph, so content PRs know the
  bar (sources footnote present, no shortlinks, nothing reproduced, open references for every
  claim), and point at [WRITING.md](./WRITING.md) for the prose itself.

## Non-goals

- No telemetry, ever, including for "understanding usage". Offline is a hard constraint.
- No CLA or governance apparatus. It is a personal project that accepts patches.
- No hosted docs site. The app and the repo are the artifacts.

## Open questions

None. The last one, the NestJS course attribution, is confirmed: the notes trace to Stephen
Grider's Udemy course. It's paywalled, so under policy rule 3 it's credited as inspiration and
the runtime section's claims cite the NestJS and TypeORM docs.
