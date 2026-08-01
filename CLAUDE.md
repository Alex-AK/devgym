# devgym — agent context

A local-first practice app for keeping web-dev fundamentals sharp. Read `README.md` first for what it
does and how to run it. This file covers what an agent needs to change it safely.

`PRD.md` is the original v1 spec and is now **historical**. Where it disagrees with the code, the
code wins: sessions, spaced repetition and executable code problems were all v1 non-goals that were
added later. `PRD-v2.md` is the **live** spec: it covers workouts, the planned workout library, and
the handbook. Read it before starting anything in that area. The three `PRD-v3-*.md` documents
extend it rather than replace it: the learning guide's curriculum map, the problem and workout
roadmap, and the open-sourcing work (about page, citation policy). Read the relevant one before
starting content, handbook or about-page work.

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
apps/server/src/
  db/                              Drizzle schema, client, migrations module
  grading/                         four graders + the sandboxed code runner
  seed/problems/<category>.ts      problem content, one file per category
  problems/ progress/ sessions/    Nest modules
  workouts/                        workspace materialisation + the vitest checkpoint runner
  cli/grade.ts                     `pnpm grade` grader-inspection tool
apps/web/src/
  pages/                           Dashboard, Session, Practice, Problem, Problems
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
- **Adding a workout** is a new directory under `packages/workouts/content/`. No application code
  changes. `workouts.spec.ts` then asserts the solution passes every checkpoint and the starter does
  not, which is what makes workout content as safe to edit as problem content.
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
