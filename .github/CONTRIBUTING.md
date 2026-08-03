# Contributing to Hone

Hone is [MIT licensed](../LICENSE) and contributions are welcome. It's a small project, so this is
short.

## Before you open a PR

Run the gate:

```sh
pnpm verify
```

That's typecheck, ESLint, Prettier and the full test suite in one command, and it auto-formats your
changed files before checking them. It runs on pre-push too, and CI runs the same thing. If it's
green, the mechanics are fine and we only have to talk about the substance.

## Adding or fixing problems

This is the most useful kind of contribution, and the easiest.

Problem content lives in `apps/server/src/seed/problems/<category>.ts`, one file per category.
Problems upsert by slug, so editing one updates it in place without wiping anyone's attempt history.
Don't author `position` — it's generated at seed time.

After editing, run `pnpm seed` to push the changes into your local database, then `pnpm test`. The
suite enforces the things that are easy to get wrong: every canonical answer must grade `correct`,
every declared near-miss must grade `close`, every `acceptPattern` must compile, no keyword synonym
may normalise to an empty string, and every coding problem's reference implementation must pass its
own tests while its starter must not.

`pnpm grade <slug> "<answer>"` prints a verdict alongside the exact config it was measured against,
which is the fastest way to tell whether a grader is too strict.

Prompts, hints, explanations and grader feedback follow the project's voice: direct, plain English,
contractions, sentence-case headings, and em dashes kept rare. [WRITING.md](../WRITING.md) is the
full version, and it governs everything a user reads.

## Adding handbook pages

A page is a markdown file with frontmatter under `packages/handbook/content/<section>/`, and adding
one touches no application code. `packages/handbook/README.md` is the authoring contract: the
five-part page shape, the frontmatter fields, and what the safety net checks.

The bar for content is the citation policy, and `pnpm verify` enforces the mechanical half of it:

- **Every page cites at least one source**, with an author, a title and a canonical URL, rendered as
  a footnote. "Common knowledge" still cites the official docs it was checked against.
- **No link shorteners.** `lnkd.in`, `bit.ly`, `t.co` and friends are rejected outright. Resolve a
  shortlink to its real target before citing it; if it's dead or the author can't be identified,
  re-source the claim or drop it.
- **Every `practise` slug resolves** to a real problem or workout.

Two rules the tests can't check, so review does:

- **Name inspirations, don't reproduce them.** Where material traces to a course or a book, credit
  it and link it, then write the page fresh in this project's own words. No course text, exercises
  or structure gets copied.
- **Paywalled sources are inspiration, never the load-bearing citation.** A paid course gets credit
  for shaping the material, but every claim on the page must be checkable against an open reference:
  official docs, or something freely readable. If no open reference exists for a claim, the claim
  doesn't ship.

## Changing behaviour

Open an issue first if the change is large or reshapes how the daily loop works. Not a gate, just
cheaper than finding out after you've written it. Small fixes can go straight to a PR.

Two constraints that aren't negotiable, because they're what the project is:

- **Fully offline.** No external API calls, no keys, no telemetry. Grading is deterministic and
  there's no LLM in the loop.
- **The stack is fixed.** pnpm workspaces, Vite + React + TS + Tailwind + shadcn/ui, NestJS +
  Drizzle + better-sqlite3, Vitest.

`CLAUDE.md` in the repo root has the rest of the architecture notes, including the gotchas that have
already bitten.

## Reporting a bug

Use the issue templates. For a grading complaint, include the problem slug, what you typed, and the
output of `pnpm grade`. That's usually the whole diagnosis.
