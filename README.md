# devgym

A local-first practice gym for staying sharp on web-dev fundamentals: SQL, JavaScript, TypeScript,
React, HTTP and the DOM. Seeded problems, typed answers, tiered feedback (correct / close / not
close), spaced repetition. You write every answer yourself and a deterministic grader marks it, so
the reps stay yours. No AI in the loop, fully offline, single user, no accounts.

**Status:** built and in daily use. 125 problems across 9 categories, deterministic grading,
executable code problems, spaced repetition, pinned daily sessions. [PRD.md](./PRD.md) is the
original v1 spec; code execution and spaced repetition were listed there as non-goals and were
pulled forward deliberately.

## Quickstart

```sh
pnpm install
pnpm dev        # server on :3001, web on :5173; DB auto-migrates and auto-seeds
```

Open http://localhost:5173 and hit **Start a session**. Requires Node 20+. Nothing else: no API
keys, no accounts, no network calls at runtime.

![A coding problem graded: two of four assertions passing, with expected vs actual for each failure and the first hint unlocked](docs/screenshot.jpg)

```sh
pnpm verify     # the gate: typecheck, lint, format and the full test suite, in parallel
pnpm test       # 280 unit tests: graders, seed data, queue, sessions, scheduling
pnpm build      # typecheck and build every package
pnpm seed       # rebuild practice.db and upsert problems by slug
pnpm grade      # check a grader from the terminal (see below)
```

`pnpm verify` formats and lint-fixes your changed files before it checks them, so most of what it
would complain about is gone by the time it reports. It runs on pre-push; `SKIP_VERIFY=1 git push`
skips it. Commits run `lint-staged` instead, which only touches staged files.

`pnpm dev` only auto-seeds an **empty** database. After adding or editing problems, run `pnpm seed`
to upsert them into an existing one.

## The daily loop

`/session` pins a fixed set of problems (5, 10 or 20) so the list cannot shift underneath you.
Every problem page then shows `Problem 3 of 10` with a progress bar, Next and Skip stay inside the
session, and finishing gives you a summary with solved / skipped counts and elapsed time.

Due reviews come first, then new material. Solved problems leave the queue, so tomorrow picks up
where today stopped. Only one session runs at a time; starting a new one closes the old.

- **Spaced repetition.** Solving schedules the problem to come round again after 1 day, then 3, 7,
  21 and 60 as you keep getting it right. Failing a review drops it back to the first rung. Solved
  is sticky, so a failed review never unsolves anything. `/practice?mode=due` serves what is due.
- **Review queue.** `/practice?mode=review` serves everything you attempted **or skipped** and have
  not yet solved. The dashboard links to it whenever there is something waiting.
- **Focused practice.** `/practice?category=react&difficulty=hard` drills one slice without pinning
  anything, running until the queue empties. The scope lives in the URL, so it survives a refresh
  and follows you through Next / Previous / Skip. Start one from the dashboard, or from the problem
  list with **Practice these**.
- **Keyboard.** `/` focuses the answer box, `Cmd/Ctrl+Enter` submits, `n` / `p` move, `s` skips,
  `Esc` leaves the box. The answer box takes focus on load, so press `Esc` before using the
  single-key shortcuts.
- **Starting over.** The dashboard reset clears statuses only, or clears everything (attempts,
  schedules and sessions) and returns to the zero state.

## Problem library

| Category      | Problems | Covers                                                                                       |
| ------------- | -------: | -------------------------------------------------------------------------------------------- |
| SQL           |       29 | joins, aggregates, `HAVING`, anti-joins, self-joins, CTEs, window functions, top-N-per-group |
| JS APIs       |       20 | array/object methods, promises, the event loop, closures, cloning                            |
| Coding        |       14 | **write the function**: chunk, debounce, memoize, LRU, retry, concurrency pool, query parser |
| TypeScript    |       12 | utility types, narrowing, generics, discriminated unions, `satisfies`                        |
| React         |       12 | state updates, effects and cleanup, keys, stale closures, memoisation                        |
| Query Params  |       10 | `URL` / `URLSearchParams`, encoding, relative resolution                                     |
| HTTP & Fetch  |       10 | status codes, `response.ok`, CORS preflight, caching, idempotency                            |
| DOM & Browser |        9 | delegation, `textContent` vs `innerHTML`, storage, observers                                 |
| Debugging     |        9 | spot-the-bug snippets: async `forEach`, `this`, floats, shared references                    |

43 easy / 58 medium / 24 hard. The queue runs easy → medium → hard and round-robins across
categories, so you never get twenty SQL questions in a row.

## How grading works

All grading is deterministic and local. No LLM, no network.

- **SQL** (29) runs your query against `practice.db` opened **read-only**, then compares raw row
  values against the canonical solution executed at the same moment. Column names and aliases never
  matter; row counts, values and (where stated) order do. Non-read statements are refused, as is
  `ATTACH`, so `app.db` is unreachable from user SQL.
- **Coding** (14) runs your function against real assertions and reports per-test pass/fail with
  expected vs actual. Console output from a failing test is attached to the diff. The editor
  prefills the signature so your function name matches the tests.
- **Short-text** (42) normalises both sides (case, whitespace, quotes, code fences, trailing
  punctuation), then checks exact matches, regex patterns, known near-misses, and finally fuzzy
  matching for typos.
- **Explain** (40) scores keyword groups: every idea must appear, half of them earns a "close".

Every non-correct attempt reveals the next hint. After three attempts you can reveal the solution,
which marks the problem skipped rather than solved.

### Running your code

Coding problems execute in a `node:vm` context with a 1 second timeout and no `require`, `process`
or filesystem access. **That is an isolation convenience, not a security boundary.** Determined code
can reach the host realm through constructor chains. It is fine here because devgym runs locally and
executes only code you typed yourself, which is the same trust level as `pnpm dev`. Do not reuse
`grading/code-runner.ts` to run code from anyone else.

### Tuning a grader

Answers are matched by pattern, so a grader can be too strict. Check one directly:

```sh
pnpm grade js-find "find"                # verdict + the exact config it was measured against
pnpm grade code-chunk "function chunk…"  # prints per-test results
pnpm grade sql-anti-join "SELECT …"      # SQL runs against the seeded practice.db
pnpm grade js-find                       # show the prompt and the model answer
pnpm grade --list react                  # slugs in a category
```

## Layout

- `apps/web`: Vite + React + shadcn/ui frontend
- `apps/server`: NestJS + Drizzle + SQLite
- `packages/shared`: shared TypeScript types, dual CJS/ESM so both apps resolve named exports
- `apps/server/src/grading`: the four graders plus the sandboxed code runner
- `apps/server/src/seed/problems`: one file per category, positions generated at seed time
- `PRD.md`: the original v1 spec, kept for provenance · `CLAUDE.md`: context for coding agents

### Data

Two SQLite files in `apps/server/data/` (gitignored, created on boot):

- `app.db`: problems, attempts, progress, sessions. Four committed migrations, applied at startup.
- `practice.db`: the read-only dataset SQL problems query. A small bookstore: `authors`, `books`,
  `customers`, `orders`, `order_items`, `reviews`, `inventory`, and a self-referencing `employees`
  table for hierarchy questions. Rebuilt from scratch by the seeder.

Delete `apps/server/data/` to start completely over.

## Adding problems

Problems live in `apps/server/src/seed/problems/<category>.ts` and are upserted by slug, so editing
one updates it without wiping your attempt history. `position` is generated, not authored.

The test suite enforces the things that are easy to get wrong: every canonical answer must grade
`correct`, every declared near-miss must grade `close`, every `acceptPattern` must compile, no
keyword synonym may normalise to an empty string, and every coding problem's reference
implementation must pass its own tests while its starter must not.

## Contributing

Issues and pull requests are both welcome. The bar is `pnpm verify` passing, which is one command
and the same thing CI runs. New problems are the most useful contribution and the easiest to review:
add them to `apps/server/src/seed/problems/`, run `pnpm seed`, and the test suite will tell you if
the content is well-formed. If a grader marked a correct answer wrong, paste the output of
`pnpm grade <slug> "<answer>"` into an issue and that's usually the whole diagnosis. See
[CONTRIBUTING.md](.github/CONTRIBUTING.md).

## Licence

[MIT](./LICENSE). Fork it, take the graders, take the problems, build your own gym.
