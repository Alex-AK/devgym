# devgym — agent context

A local-first practice app for keeping web-dev fundamentals sharp. Read `README.md` first for what it
does and how to run it. This file covers what an agent needs to change it safely.

**The code is the source of truth for what exists.** No document in this repo lists what has shipped,
by design: the seed files, `packages/handbook/content/`, `packages/workouts/content/` and
`packages/paths/content/` are the live inventory, and a status line would only go stale. Three
documents hold what the code cannot say, and this file is the entry point to them:

- **`docs/content.md`** — the bar every problem, handbook page, workout and module clears, and how to
  write each one. Read the relevant section before adding content.
- **`docs/decisions.md`** — why things are the way they are, and what this project deliberately
  refuses to do. Read it before reopening a settled question or filling a gap that looks obvious;
  several of those gaps are recorded refusals.
- **`docs/roadmap.md`** — only what is not built. A row leaves it when the thing ships.

Six version-numbered PRDs preceded these and were folded into them. Git history has the originals if
a piece of reasoning seems to be missing.

## What it is for, and what that rules out

Practical knowledge for **web engineering and AI engineering**: what you actually hit shipping
features, and increasingly what you hit shipping features against a model. Content earns its place by
being useful in that work, judged against a 15-minute morning session. Nothing earns its place by
completing a set.

**Completionism is the failure mode to watch for**, because it looks like diligence and is easy to
measure. The library has three halves, problems, workouts and handbook pages, and they do not map
1:1:1. A problem does not owe a page. A page does not owe a workout. A category does not owe an even
spread of difficulties. The `explanation` field is read in the thirty seconds after solving and is
meant to carry the lesson on its own, so most reps need nothing behind them at all.

What a page is for is the model that several reps share, where getting that model wrong is what makes
all of them fail. A fact you would look up is a rep and nothing more. Only one mapping is enforced,
and it is the only one worth enforcing: a page names somewhere to practise it, or it does not ship.

So **an uncited problem is not debt**, and a gap nobody would notice while working is not a gap.
Where a topic is genuinely not worth a page, the right move is to say so and leave it, in the
document that raised it. Several such refusals are already recorded in `docs/decisions.md`; add to
them rather than quietly closing them.

## Hard constraints

- Stack is fixed: pnpm workspaces, Vite + React + TS + Tailwind + shadcn/ui, NestJS + Drizzle +
  better-sqlite3, Vitest. Don't substitute.
- Fully offline at runtime: no external API calls, no keys, no telemetry. Grading is deterministic;
  there is no LLM in the loop.
- User SQL runs only against `practice.db` opened readonly, never `app.db`. `ATTACH` is refused.
- TypeScript strict everywhere. Shared API types live in `packages/shared`, which builds to both
  CJS and ESM so Nest and Vite can each resolve named exports.
- Strictness flags live in `tsconfig.base.json` and every package extends it. Add a flag there, not
  in one package, so the three can't drift apart again.

## Layout

```
packages/shared/src/index.ts       types + const tuples, no runtime deps
packages/workouts/content/<slug>/  workout content: manifest, brief, files, tests, solution
packages/paths/content/<slug>/     the essentials path: one path.json an hour, ordering the above
apps/server/src/
  db/                              Drizzle schema, client, migrations module
  grading/                         four graders + the sandboxed code runner
  seed/problems/<category>.ts      problem content, one file per category
  problems/ progress/ sessions/    Nest modules
  paths/                           the essentials path: loader, safety net, read-only API
  workouts/                        workspace materialisation + the vitest checkpoint runner
  cli/grade.ts                     `pnpm grade` grader-inspection tool
apps/web/src/
  pages/                           Dashboard, Session, Practice, Problem, Problems, Paths
  components/CodeEditor.tsx        CodeMirror 6 wrapper, used for sql and js-code answers
  components/ui/                   hand-written shadcn components
```

## Working on it

- **Adding or editing problems** touches only `seed/problems/*.ts`. Problems upsert by slug, so an
  edit updates in place without wiping attempt history. `position` is generated in
  `problems.seed.ts`, never authored.
- **Every problem declares a `relevance`**, which is a separate axis from difficulty: `daily` for
  what you write in ordinary feature work, `occasional` for a bug or a perf pass or an edge case,
  `foundational` for what you meet through a framework more often than you write. Author it
  honestly. A hard problem can be daily bread and an easy one can be pure trivia, and the label is
  what lets a 15-minute session be judged on what it is actually teaching.
- **`js-code` tests take an `expression`, not statements.** It is evaluated after the submission, so
  multi-step setup has to be wrapped in an IIFE. Use `expectedCode` for values JSON cannot hold.
- **After editing problems, run `pnpm seed`.** Boot only auto-seeds an empty database.
- **Schema changes** need `pnpm --filter @devgym/server db:generate` and the generated SQL
  committed. Migrations apply automatically at startup.
- **`pnpm verify` is the gate**, and CI runs the same thing. It fans typecheck, ESLint, Prettier and
  the test suite out in parallel, after auto-fixing your changed files. Run it before saying you're
  done, not `pnpm test` alone.
- **The test suite is what makes problem content safe to edit.** It asserts every canonical answer
  grades `correct`, every near-miss grades `close`, every regex compiles, no keyword synonym
  normalises to an empty string, and every coding problem's reference passes its own tests while its
  starter does not.
- **Seeding without touching the real database:** set `DEVGYM_DATA_DIR` to a scratch path. Useful
  for checking the seeder end to end when the user is mid-streak.
- **Adding a session to the essentials path** is a `path.json` under `packages/paths/content/`. It
  authors nothing: it orders pages, reps and workouts that already exist, and `paths.spec.ts` refuses
  a ref that resolves to nothing or a rep placed before the page explaining it. The path is a subset
  on purpose, so read the bar in `docs/content.md` before adding one: the test is whether leaving
  something out would make the hour incoherent, not whether it is good.
- **Adding a workout** is a new directory under `packages/workouts/content/`. No application code
  changes. `workouts.spec.ts` then asserts the solution passes every checkpoint and the starter does
  not, which is what makes workout content as safe to edit as problem content.
- **A brief states the symptom, never the cause.** Working out what is wrong is the exercise, so
  `brief.md` and the manifest `summary` describe what someone would report ("9 seconds in
  production"), not the diagnosis ("a query per row, and no index"). Constraints and unguessable
  environment details stay explicit; checkpoint hints are where it is safe to be specific, because
  they appear only after that checkpoint has failed. See `WRITING.md`.
- **A workout needs a new library?** Add it to `packages/workouts/package.json`. Workspaces symlink
  their `node_modules` at that package, which is how a workout imports the real drizzle-orm.

## Conventions

- All user-facing copy follows `WRITING.md`. Read it before writing or editing any prose: problem
  prompts, hints, explanations, grader feedback, briefs, handbook pages, UI strings and repo docs.
  The em-dash rules are the ones that bite, and never bulk-regex dashes out of prose: it mangles
  dual-dash asides. Rewrite by hand and diff sentences that contained a pair.
- Commit in meaningful increments with plain descriptive messages.
- Prettier owns formatting: single quotes, 100 columns, semicolons. Never hand-format to fight it.
- ESLint runs type-aware. When a rule fires on something deliberate, prefer an inline disable with a
  one-line reason over widening the config; only add a config override when a whole directory shares
  the same justification.
- Keep `apps/server/data/` gitignored. Migrations and seed sources are committed.
- shadcn components are hand-written into `components/ui/`, not pulled from the CLI. Add only what
  gets used.

## Gotchas that have already bitten

- `node:vm` in `grading/code-runner.ts` is an isolation convenience, **not** a security boundary,
  and errors thrown inside it fail `instanceof Error` because they come from another realm.
- The answer box takes focus on load, so single-key shortcuts (`n`/`p`/`s`) only fire after `Esc`.
- Session item outcomes are derived from a per-item snapshot of `solved_at`/`last_skipped_at`, not
  from a timestamp comparison against the session start, because a skip and a session start can
  land in the same millisecond.
- `solved_at` is refreshed on **every** correct answer, not just the first, so completed reviews are
  visible to that snapshot comparison.
