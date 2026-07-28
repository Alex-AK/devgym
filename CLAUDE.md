# devgym — agent context

A local-first practice app for keeping web-dev fundamentals sharp. Read `README.md` first for what it
does and how to run it. This file covers what an agent needs to change it safely.

`PRD.md` is the original v1 spec and is now **historical**. Where it disagrees with the code, the
code wins: sessions, spaced repetition and executable code problems were all v1 non-goals that were
added later.

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
apps/server/src/
  db/                              Drizzle schema, client, migrations module
  grading/                         four graders + the sandboxed code runner
  seed/problems/<category>.ts      problem content, one file per category
  problems/ progress/ sessions/    Nest modules
  cli/grade.ts                     `pnpm grade` grader-inspection tool
apps/web/src/
  pages/                           Dashboard, Session, Practice, Problem, Problems
  components/ui/                   hand-written shadcn components
```

## Working on it

- **Adding or editing problems** touches only `seed/problems/*.ts`. Problems upsert by slug, so an
  edit updates in place without wiping attempt history. `position` is generated in
  `problems.seed.ts`, never authored.
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

## Conventions

- User-facing copy follows the project's writing voice: direct, plain English, contractions,
  sentence-case headings, and em dashes kept rare (commas for dependent clauses, colons for list
  introductions, parentheses or a second sentence for asides). This applies to problem prompts,
  hints, explanations, grader feedback and UI strings.
- Never bulk-regex prose to strip em dashes. It mangles dual-dash asides and questions. Rewrite by
  hand, or diff against the original for sentences containing a _pair_ of dashes afterwards.
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
