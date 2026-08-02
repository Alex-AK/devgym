# devgym — PRD v4: modules

> **Status: not started.** A fourth content type, and the first one since workouts that needs
> application code rather than a directory. Nothing here changes how problems, workouts or handbook
> pages work.
>
> This extends [PRD-v2](./PRD-v2.md), which remains the live spec for the workout platform and for
> what a handbook page is. Siblings: [PRD-v3-learning-guide](./PRD-v3-learning-guide.md) for the
> handbook map, [PRD-v3-content-roadmap](./PRD-v3-content-roadmap.md) for the problem and workout
> queue, [PRD-v3-open-source](./PRD-v3-open-source.md) for the citation policy this document
> inherits.

## Why

The three content types all assume you already know the thing you are practising. A problem is one
rep. A workout is a build under time. A page is reference you keep open beside the work. None of
them teaches an API from the beginning, and there is a specific gap they all miss.

It is the handful of APIs you use constantly and understand shallowly. `Date`. `Promise`. `JSON`.
Error handling. You have written them a thousand times and still look up the argument order, still
get caught by the month index, still catch an error that was never going to be an `Error`. A hint
does not fix that, because the problem is not that you are stuck. The problem is that your model is
wrong in a way that has never cost you enough to notice.

What fixes it is sitting down with the API for twenty minutes, predicting what each call does, being
wrong out loud, and seeing why. That is a module.

## What a module is

One sitting with one API. Fifteen to twenty-five minutes, ordered steps, and at every step you
commit to an answer before the answer appears.

| Type    | Length    | You arrive            | It measures                     |
| ------- | --------- | --------------------- | ------------------------------- |
| Problem | 60-90s    | knowing the concept   | recall, on a schedule           |
| Workout | 25 min    | knowing the stack     | execution under time            |
| Page    | 3-4 min   | needing one answer    | nothing, deliberately           |
| Module  | 15-25 min | not really knowing it | whether you can predict the API |

The distinction that matters is the last column. A problem asks whether you remember. A module asks
whether your model is right, which is a different question and the one nobody asks you until
production does.

## The step, and what makes it interactive

Every step is predict, run, correct:

1. **Predict.** The step states a question with a definite answer and takes yours before running
   anything. Committing to a wrong answer is what makes the correction stick; reading the right one
   first does not.
2. **Run.** Your code, or the step's code, executed by the grader devgym already has.
3. **Correct.** What actually happened, and the one sentence explaining why.

This is not decoration. Predicting before seeing is the generation effect, and being tested rather
than re-reading is retrieval practice; both are named on the learning-techniques page specified in
[PRD-v3-open-source](./PRD-v3-open-source.md), and the modules are the clearest place in the app
where a technique is the mechanism rather than a label on it.

A step that cannot pose a question with a definite answer is a handbook page, and belongs there.

## Shape on disk

Same principle as workouts and pages: content is a directory.

```
packages/modules/content/<slug>/
  module.json          title, summary, order, minutes, practise, sources, verified
  01-<step-slug>.md    steps, ordered by filename prefix
  02-<step-slug>.md
```

A step is markdown with a small frontmatter block and two tagged fences:

````markdown
---
title: Months count from zero and days count from one
predict: What does `new Date(2026, 1, 1)` print as a date string?
---

Prose, as short as it can be.

```js run
new Date(2026, 1, 1).toDateString();
```

```js assert
result === 'Sun Feb 01 2026';
```
````

Two things this deliberately reuses:

- **Assertions are expressions, not statements**, evaluated after the snippet, exactly as `js-code`
  problem tests are today. The IIFE rule for multi-step setup carries over unchanged.
- **The fences carry the code, not the frontmatter.** The handbook's YAML parser takes strings, lists
  of strings and lists of flat objects, and teaching it block scalars to hold source would be the
  wrong trade. A tagged fence is already valid markdown and renders on GitHub.

`practise` and `sources` mean what they mean everywhere else, and the citation policy applies
unchanged: at least one open source per module, no link shorteners, a `verified` date.

## What the app has to grow

The honest part of this document. Modules are the first content type since workouts that is not
free.

1. **`packages/modules`** — content directory, loader and validator, mirroring `packages/handbook`.
   Extracts the tagged fences, refuses a malformed step by name and line.
2. **A `modules` Nest module** — list, get, and one run endpoint that hands `{ code, assertions }` to
   the existing `grading/code-runner.ts`. The runner does not change. This is the only genuinely new
   server surface.
3. **The step view on the web** — reuses `CodeEditor` and `Markdown`. Predict box, run button,
   result, correction.
4. **`modules.spec.ts`** — the safety net, mirroring `workouts.spec.ts`. Every step's assertions pass
   against its own snippet, every `practise` slug resolves, every module cites something, every step
   has a predict question.

**No schema change in v1.** Modules get no progress tracking, for the same reason handbook pages get
none: the problems are the progress tracking. A module's `practise` list is how it shows up in your
queue afterwards. If lived use says a half-finished module needs to be resumable, that is a v2
conversation with a migration attached, not something to build speculatively.

## The first modules

Six, in build order. Each is an API that is used daily and understood shallowly, which is the entry
requirement.

| Module              | The wrong model it corrects                                                          |
| ------------------- | ------------------------------------------------------------------------------------ |
| `js-date`           | That a `Date` is a date. It is an instant, months count from zero, parsing is a trap |
| `promises`          | That `await` in a loop and `Promise.all` differ only in style                        |
| `json`              | That `JSON.stringify` round-trips your object                                        |
| `js-errors`         | That `catch` catches what you think, and that a thrown thing is an `Error`           |
| `tokens-and-crypto` | That a signed token is an encrypted one, and that comparing strings is safe          |
| `node-fs`           | That reading a file is one call and writing one is atomic                            |

Notes on the harder two. `js-date` must say plainly where `Temporal` stands rather than teach an API
that is not everywhere yet. `tokens-and-crypto` is the one module where a wrong model is a
vulnerability rather than a bug, so it stays on `node:crypto` and `jose`, which the workouts already
depend on, and it does not invent its own primitives.

**A seventh, on my recommendation: `regex`.** Universal, universally shaky, deterministic to grade,
and catastrophic backtracking is a production outage rather than a curiosity. It fits the format
exactly.

Everything past that waits for these to land. Content is never finished, and modules are more
expensive per unit than problems, so the queue stays short on purpose.

## Build order

Sized to land one at a time, each leaving the repo green.

1. `packages/modules` with the loader, validator and spec, using the first three steps of `js-date`
   as the fixture. No UI, no endpoints. The spec is the proof.
2. The `modules` Nest module and the run endpoint over the existing code runner.
3. The web list and step view.
4. `js-date` in full, which is the format's real test: if the shape survives timezones it survives
   anything.
5. `promises`, `json`, `js-errors`, one at a time.
6. `tokens-and-crypto`, `node-fs`, `regex`.

Items 1 to 3 are the whole application cost. Everything after is content.

## Non-goals

- **Not a course platform.** No enrolment, no certificates, no percentage complete across the
  library, no streaks on modules.
- **No branching.** Steps are ordered and linear. A module that needs a decision tree is two modules.
- **No video, no audio, no animation.** The format is text, code and a result.
- **Not a replacement for the handbook.** A module teaches an API from the beginning; a page answers
  one question when you already know roughly where you are. Both, and they link to each other.

## Open questions

- **Does a module fit a morning?** It is longer than the 15-minute queue and shorter than a workout,
  which is either a useful middle or an awkward one. Lived use decides, and the answer probably also
  settles PRD-v2's open question about whether workouts fit a morning at all.
- **Should a failed prediction schedule anything?** The spaced-repetition ladder exists and modules
  deliberately do not touch it. A wrong prediction is exactly the signal the ladder wants, so this is
  worth revisiting once there is real data, with a migration.
