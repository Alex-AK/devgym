> **Historical document.** This is the original v1 specification, written before any code existed.
> It is kept for provenance. The app has since grown past it: pinned daily sessions, spaced
> repetition and executable code problems were all listed here as non-goals and were added anyway.
> For what devgym actually does today, read [README.md](./README.md).

# devgym — PRD v1

A local-first practice app for sharpening web-dev fundamentals (SQL, query params / URL handling, practical JS APIs). Single user, self-hosted, fully offline. This document is the complete, actionable spec for the v1 build — an implementing LLM should be able to build the whole app from this file without further product decisions.

---

## 1. Overview

- **What:** A web app that serves seeded practice problems, grades typed answers with tiered feedback (correct / close / not close), and tracks progress on a dashboard.
- **Who:** One local user (Alex). No auth in v1, but the schema must be auth-ready (see §5).
- **Where:** Runs entirely on localhost. No network calls at runtime, no API keys, no telemetry. All knowledge is self-contained in the seed data.
- **Grading:** 100% deterministic and local. SQL answers execute against a real seeded SQLite practice dataset; text answers use normalization + fuzzy/keyword matching. No LLM grading in v1.

## 2. Non-goals (v1)

- No authentication, no user switching (schema is prepared for it, UI is not).
- No executing user-submitted JavaScript (JS problems are graded as text; a sandboxed runner is a v2 idea).
- No problem-authoring UI (problems live in seed files).
- No spaced repetition / scheduling algorithm.
- No deployment story beyond `pnpm dev` locally.

## 3. User experience

### 3.1 Startup

`pnpm install && pnpm dev` from the repo root starts both the server (port **3001**) and the web app (Vite, port **5173**, proxying `/api` → 3001). On first boot the server auto-runs migrations and auto-seeds (problems + practice dataset) if the DB is empty. No manual setup steps.

### 3.2 Dashboard (`/`)

- **Zero state** (no attempts yet): a welcome card — app name, one-paragraph explanation of what devgym is, the three category chips (SQL · Query Params · JS APIs), problem count, and a primary "Start practicing" CTA that routes to `/practice`.
- **Active state** (≥1 attempt): stat tiles (solved X/10, total attempts, accuracy %), per-category progress bars, per-difficulty breakdown (easy/medium/hard solved counts), and a "Recent activity" list of the last 10 attempts (problem title, verdict badge, relative time). Keep the "Continue practicing" CTA visible.

### 3.3 Practice loop (`/practice` and `/problems/:slug`)

`/practice` redirects to the next problem in the queue (see §6.4). The problem view shows:

- Header: title, category badge, difficulty badge (easy=green, medium=yellow, hard=red), status.
- Prompt rendered as markdown (code blocks must render properly).
- For `sql` problems: a collapsible **schema panel** showing the practice DB tables/columns (from `GET /api/practice-schema`), and a note whether row order matters.
- Answer input: monospace `Textarea` (multi-line for SQL, fine for all types). Cmd/Ctrl+Enter submits.
- **Submit** → verdict banner: ✅ correct (green) / 🟡 close (yellow, with guidance) / ❌ not close (red, with guidance). Each failed attempt auto-reveals the next hint (shown in a hint list that persists).
- Buttons: **Skip** (moves problem to back of queue, advances to next), **Next / Previous** (cycle through the queue), **Retry** is implicit (just submit again — solved problems can also be re-attempted anytime without losing solved status).
- After solving: show the canonical solution + explanation, and a "Next problem" CTA.
- **Reveal solution** button appears after ≥3 failed attempts; using it shows the solution/explanation and marks the problem `skipped` with `solution_viewed = true` (it does not count as solved).
- When the queue is empty (all solved): a congratulations state with a link back to the dashboard and a note that solved problems can be re-attempted from `/problems`.

### 3.4 Problem list (`/problems`)

A table of all problems: title, category, difficulty, status badge (unseen / in progress / solved / skipped), attempt count. Filterable by category and status. Rows link to the problem.

## 4. Architecture

### 4.1 Stack (fixed — do not substitute)

- **Monorepo:** pnpm workspaces. Root `pnpm dev` uses `concurrently` to run both apps.
- **Web:** Vite + React 18 + TypeScript (strict) + Tailwind + **shadcn/ui** components + react-router. Use TanStack Query for server state.
- **Server:** **NestJS** + **Drizzle ORM** + **better-sqlite3**. Global prefix `/api`.
- **Shared:** `packages/shared` — TypeScript types/DTOs shared by both apps (Verdict, ProblemSummary, AttemptResponse, etc.).
- **Tests:** Vitest (or Jest in the Nest app if smoother) — grader unit tests are required (§10).

### 4.2 Layout

```
devgym/
  package.json            # scripts: dev, build, test, seed, lint
  pnpm-workspace.yaml
  PRD.md  README.md  CLAUDE.md
  packages/shared/        # types only, no runtime deps
  apps/web/               # Vite + React + shadcn
  apps/server/
    src/
      db/                 # drizzle schema, migrations, connection
      seed/               # problems.seed.ts, practice-data.ts
      grading/            # sql-grader, text-grader, keyword-grader + tests
      problems/           # controller + service
      progress/           # dashboard stats
    data/                 # app.db + practice.db (gitignored)
```

### 4.3 Databases

Two SQLite files in `apps/server/data/` (gitignored, created on boot):

- **`app.db`** — application state: users, problems, attempts, progress. Drizzle migrations (generated with drizzle-kit, committed to the repo, applied automatically at server startup via Drizzle's `migrate()`).
- **`practice.db`** — the read-only dataset that SQL problems query. Rebuilt from scratch by the seeder (drop & recreate). User SQL runs against this file opened with `{ readonly: true }` — never against `app.db`.

`pnpm seed` (root script) rebuilds `practice.db` and upserts problems into `app.db` by slug (so re-seeding updates prompts/graders without wiping attempt history).

## 5. Data model (app.db, Drizzle schema)

Auth-ready: every user-owned row carries `user_id`. Seed exactly one user (`id = 1`, name "Local"). The server resolves the current user via a single `CurrentUserService` that hardcodes `1` — future auth replaces only that service.

```
users             id PK, name, created_at
problems          id PK, slug UNIQUE, title, category ('sql'|'query-params'|'js-apis'),
                  difficulty ('easy'|'medium'|'hard'), type ('sql'|'short-text'|'explain'),
                  position INT (queue order), prompt TEXT (markdown),
                  grader_config TEXT (JSON, see §6), solution TEXT (markdown),
                  explanation TEXT (markdown)
attempts          id PK, user_id FK, problem_id FK, answer TEXT,
                  verdict ('correct'|'close'|'incorrect'), created_at
problem_progress  user_id + problem_id composite PK,
                  status ('unseen'|'in_progress'|'solved'|'skipped'),
                  attempts_count INT default 0, hints_revealed INT default 0,
                  solution_viewed INT (bool) default 0,
                  last_skipped_at TEXT nullable, solved_at TEXT nullable,
                  last_seen_at TEXT nullable
```

Status transitions: `unseen` → `in_progress` (first view or attempt) → `solved` (correct attempt) or `skipped` (skip button / reveal-solution). Skipped problems return to `in_progress` on their next attempt. Solved is sticky — later wrong attempts don't unsolve. `POST /:slug/reset` returns a problem to `unseen` and zeroes `hints_revealed`/`solution_viewed` (attempt history rows are kept).

## 6. Grading engine

Each problem's `grader_config` JSON is discriminated by problem `type`. All graders return `{ verdict, feedback, autoHint? }`.

### 6.1 `sql` grader

Config: `{ solutionSql: string, orderMatters: boolean }`

1. **Safety:** open `practice.db` readonly. Reject with `incorrect` + clear feedback if: the statement isn't a single statement (better-sqlite3 throws on trailing content), it isn't a reading statement (`stmt.reader !== true`), or it errors — return the SQLite error message as feedback ("Your query failed to run: …"). Cap results at 1,000 rows.
2. **Expected result:** execute `solutionSql` against `practice.db` at grade time (never store expected rows — this keeps grading correct if seed data evolves).
3. **Comparison:** raw arrays of row values (`stmt.raw()`), so column _names/aliases never matter_; column **count** must match. Values compare loosely: numbers compare numerically (1 == 1.0), everything else by string equality, NULL == NULL.
4. **Verdicts:**
   - Exact match (ordered when `orderMatters`, multiset otherwise) → `correct`.
   - `orderMatters` and multisets match but order differs → `close`, feedback "Right rows, wrong order — check your ORDER BY."
   - Column count mismatch → `incorrect`, feedback "Expected N column(s), got M."
   - Multiset overlap ≥ 50% of expected rows → `close`, feedback stating how many rows are missing/extra.
   - Otherwise → `incorrect`.

### 6.2 `short-text` grader

Config: `{ accept: string[], acceptPatterns?: string[], nearMisses?: Record<string,string>, hints: string[] }`

- **Normalize** both sides: trim, lowercase, collapse internal whitespace, strip wrapping quotes/backticks and trailing punctuation/semicolons.
- `correct` if normalized answer equals any `accept` entry, or matches any `acceptPatterns` regex (patterns tested against the raw trimmed answer, case-insensitive).
- `nearMisses`: normalized-answer → tailored feedback, returned as `close` (e.g. answering `filter` when the answer is `find`).
- Fuzzy fallback **only for accept strings ≥ 6 chars**: Levenshtein similarity ≥ 0.85 → `correct` (typo tolerance); ≥ 0.70 → `close` ("You're close — check spelling/exact form.").
- Otherwise `incorrect`.

### 6.3 `explain` grader (keyword groups)

Config: `{ groups: { synonyms: string[], missingFeedback: string }[], hints: string[] }`

- A group matches if any synonym appears in the normalized answer (substring match).
- All groups match → `correct`. At least ⌈half⌉ → `close`, feedback = the first unmatched group's `missingFeedback`. Fewer → `incorrect`, same feedback mechanism.

### 6.4 Queue, hints, cycling

- **Queue** = problems where status ≠ `solved`, ordered by: never-skipped first (by `position`), then skipped ones (by `last_skipped_at` ascending). Next/Previous wrap around within the queue.
- **Hints:** every non-correct attempt increments `hints_revealed` (capped at the hint count) and the response includes the newly revealed hint. `GET /problems/:slug` returns all currently revealed hints. SQL problems use their `hints` array in grader config too (all three grader configs include `hints: string[]`).

## 7. API (NestJS, all under `/api`)

| Method & path                              | Purpose                                                                                                                               |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /progress`                            | Dashboard payload: `{ hasActivity, solved, total, totalAttempts, accuracy, byCategory[], byDifficulty[], recentAttempts[] }`          |
| `GET /problems`                            | List with per-problem status, difficulty, category, attempts_count                                                                    |
| `GET /problems/next?after=<slug>`          | Next queue item (wraps; `after` optional)                                                                                             |
| `GET /problems/:slug`                      | Detail: prompt, type, badges, revealed hints, status; includes `solution`+`explanation` only when solved or `solution_viewed`         |
| `POST /problems/:slug/attempts` `{answer}` | Grade → `{ verdict, feedback, newHint?, revealedHints, status, attemptsCount, solution? }` (solution included when verdict = correct) |
| `POST /problems/:slug/skip`                | Mark skipped, stamp `last_skipped_at`; returns next queue item                                                                        |
| `POST /problems/:slug/reveal-solution`     | Only allowed when attempts_count ≥ 3; marks skipped + solution_viewed; returns solution                                               |
| `POST /problems/:slug/reset`               | Back to unseen (keeps attempt rows)                                                                                                   |
| `GET /practice-schema`                     | `{ tables: [{ name, columns: [{name, type}], rowCount }] }` for the SQL side panel                                                    |

Validation via Nest pipes; unknown slug → 404; malformed body → 400.

## 8. Practice dataset (practice.db)

A small bookstore, seeded **deterministically** from literal data in `apps/server/src/seed/practice-data.ts` (no randomness — graders re-execute solution SQL, but stable data makes debugging sane).

```
authors      id, name, country                       (8 rows)
books        id, title, author_id, genre, price, published_year   (15 rows)
customers    id, name, email, city, joined_at        (10 rows)
orders       id, customer_id, ordered_at, status ('completed'|'cancelled')  (20 rows)
order_items  id, order_id, book_id, quantity, unit_price          (~40 rows)
```

**Hard requirements on the data** (they make the seed problems well-posed):

- ≥3 genres including exactly one named `Fantasy` (with 4–6 books in it).
- ≥8 books with `published_year > 2015`, and **all book prices distinct** (so ORDER BY price + LIMIT 5 has one right answer).
- ≥2 customers with zero completed orders (some may have only cancelled orders — that's the trap P3 teaches).
- ≥4 cancelled orders with order_items attached (so status filtering changes P4's numbers).
- Per-genre revenue totals all distinct (so P4's ordering is unambiguous).

## 9. Seed problems (all 10, complete)

`position` = listed order. Every problem needs `solution` (canonical answer, shown after solving) and `explanation` (2–5 sentences of _why_, teaching the concept). Hints below are ordered mildest → strongest.

### P1 `sql-select-genre` — SQL · easy · type `sql`

**Prompt:** List the titles of all books in the **Fantasy** genre. Return one column: `title`. Row order doesn't matter.
**Config:** solutionSql `SELECT title FROM books WHERE genre = 'Fantasy';`, orderMatters false.
**Hints:** ["You only need the `books` table.", "Filter rows with `WHERE genre = 'Fantasy'` — string literals use single quotes."]

### P2 `sql-top-recent` — SQL · easy · type `sql`

**Prompt:** Show the **title and price** of the 5 most expensive books published after 2015, most expensive first.
**Config:** solutionSql `SELECT title, price FROM books WHERE published_year > 2015 ORDER BY price DESC LIMIT 5;`, orderMatters **true**.
**Hints:** ["Combine a WHERE filter with ORDER BY.", "`ORDER BY price DESC` sorts high→low; `LIMIT 5` keeps the top 5."]

### P3 `sql-orders-per-customer` — SQL · medium · type `sql`

**Prompt:** For **every** customer, show their name and how many **completed** orders they've placed — including customers with zero. Columns: `name`, `order_count`. Row order doesn't matter.
**Config:** solutionSql `SELECT c.name, COUNT(o.id) AS order_count FROM customers c LEFT JOIN orders o ON o.customer_id = c.id AND o.status = 'completed' GROUP BY c.id, c.name;`, orderMatters false.
**Hints:** ["\"Including zero\" means an INNER JOIN won't work.", "Careful: filtering status in WHERE turns a LEFT JOIN back into an inner join — put the status condition in the ON clause.", "COUNT(o.id) counts matched rows only; COUNT(*) would count zero-order customers as 1."]
**Explanation must cover:** the ON-vs-WHERE trap with LEFT JOIN.

### P4 `sql-revenue-by-genre` — SQL · hard · type `sql`

**Prompt:** Compute total revenue per genre across **completed** orders only, highest revenue first. Revenue = `quantity × unit_price`. Columns: `genre`, `revenue`.
**Config:** solutionSql `SELECT b.genre, SUM(oi.quantity * oi.unit_price) AS revenue FROM order_items oi JOIN books b ON b.id = oi.book_id JOIN orders o ON o.id = oi.order_id WHERE o.status = 'completed' GROUP BY b.genre ORDER BY revenue DESC;`, orderMatters **true**.
**Hints:** ["You need three tables: order_items, books, orders.", "Aggregate with SUM(quantity * unit_price), grouped by genre.", "Don't forget to exclude cancelled orders with WHERE."]

### P5 `qp-get-first` — Query Params · easy · type `short-text`

**Prompt:** Given:

```js
const url = new URL('https://shop.dev/search?tag=sale&tag=new&page=2');
```

What value does `url.searchParams.get('tag')` return?
**Config:** accept `["sale"]`; nearMisses `{ "new": "That's the second occurrence — get() doesn't return the last one.", "sale,new": "get() returns a single value, not all of them — getAll() does that." }`.
**Hints:** ["The param appears twice, but get() returns only one string.", "get() returns the **first** occurrence."]

### P6 `qp-get-all` — Query Params · easy · type `short-text`

**Prompt:** Same URL as before. Write the expression that returns **all** values of `tag` as an array (`['sale', 'new']`).
**Config:** acceptPatterns `["searchParams\\s*\\.\\s*getAll\\(\\s*['\"]tag['\"]\\s*\\)"]`; nearMisses `{ "url.searchparams.get('tag')": "get() only returns the first value." }`.
**Hints:** ["There's a dedicated method for multi-value params.", "It's `getAll(name)` on searchParams."]

### P7 `qp-build` — Query Params · medium · type `short-text`

**Prompt:** You have `const params = { q: 'shoes', size: '42' };`. Using a built-in web API, write an expression that produces the string `q=shoes&size=42` (no leading `?`).
**Config:** acceptPatterns `["new\\s+URLSearchParams\\(\\s*params\\s*\\)\\s*\\.\\s*toString\\(\\s*\\)", "String\\(\\s*new\\s+URLSearchParams\\(\\s*params\\s*\\)\\s*\\)"]`; nearMisses `{}` — but if the normalized answer _contains_ `urlsearchparams` without matching a pattern, return `close` with "Right API — check how you construct and serialize it." (implement as a nearMiss-by-substring option: config key `closeSubstrings: Record<string,string>`).
**Hints:** ["The URLSearchParams constructor accepts a plain object.", "`.toString()` serializes it — and it handles encoding for you."]

### P8 `js-find` — JS APIs · easy · type `short-text`

**Prompt:** Which array method returns the **first element** that matches a predicate function (the element itself, not its position)?
**Config:** accept `["find", "array.prototype.find", ".find", "find()", "arr.find"]`; nearMisses `{ "filter": "filter() returns *all* matches in a new array — we want a single element.", "findindex": "findIndex() returns the position, not the element.", "indexof": "indexOf() takes a value, not a predicate, and returns a position." }`.
**Hints:** ["It takes a callback and stops at the first match.", "Four letters, introduced in ES6."]

### P9 `js-allsettled` — JS APIs · medium · type `explain`

**Prompt:** You fire 3 fetches with `Promise.all` and one rejects — the whole thing rejects and you lose the other two results. Which Promise combinator gives you **every** outcome, and what is the shape of what it resolves with?
**Config:** groups:

1. synonyms `["allsettled"]` — missingFeedback "Name the combinator — it's a static method on Promise that never short-circuits."
2. synonyms `["status"]` — missingFeedback "Each result object has a field telling you whether that promise fulfilled or rejected."
3. synonyms `["value", "reason"]` — missingFeedback "What's on the result object for a fulfilled promise vs a rejected one?"
   **Hints:** ["It never rejects, no matter what the input promises do.", "It resolves with an array of objects, one per input promise.", "Each object is `{status: 'fulfilled', value}` or `{status: 'rejected', reason}`."]

### P10 `js-abort` — JS APIs · medium · type `explain`

**Prompt:** Which web API lets you cancel an in-flight `fetch`, and how do you wire it up? (Name the API and the two key steps.)
**Config:** groups:

1. synonyms `["abortcontroller"]` — missingFeedback "It's a controller object made for exactly this."
2. synonyms `["signal"]` — missingFeedback "Something from the controller gets passed into fetch's options object."
3. synonyms `["abort("]` + `["abort()"]` → use synonyms `[".abort", "abort()"]` — missingFeedback "How do you actually trigger the cancellation?"
   **Hints:** ["`new AbortController()`.", "Pass `controller.signal` as fetch's `signal` option.", "Call `controller.abort()` to cancel; the fetch rejects with an AbortError."]

## 10. Testing requirements

Grader unit tests are **required** (UI e2e is not). Minimum coverage:

- **Text normalizer:** quotes/backticks stripped, case/whitespace folded.
- **short-text:** exact accept, pattern accept, nearMiss → close, fuzzy typo → correct (e.g. "abortcontroler"), garbage → incorrect.
- **explain:** all groups → correct, half → close with the right missingFeedback, none → incorrect.
- **sql:** correct query → correct; same rows wrong order with orderMatters → close; wrong-but-overlapping rows → close; column count mismatch → incorrect; `DELETE FROM books` → incorrect with safety feedback; syntax error → incorrect with SQLite message; alias in SELECT (e.g. `AS n`) still grades correct.
- Per-problem smoke test: for each of the 10 seeds, its canonical solution grades `correct` (for SQL, run the actual solutionSql through the grader).

## 11. Acceptance criteria (definition of done)

1. Fresh clone → `pnpm install && pnpm dev` → both apps boot, DB auto-migrates + auto-seeds, `http://localhost:5173` shows the welcome zero state. No errors in either console.
2. All 10 problems browsable and gradable; each canonical solution returns `correct`; wrong answers produce tiered feedback and progressive hints.
3. Skip cycles the problem to the back of the queue and advances; Next/Previous cycle and wrap; solved problems show solution + explanation and update the dashboard immediately.
4. Reveal-solution gated behind 3 attempts and marks skipped (not solved).
5. Dashboard active state shows correct counts after solving ≥1 problem (verify by hand: solve P1, check solved=1, category SQL 1/4).
6. SQL grading is safe: non-SELECT statements refused, `app.db` unreachable from user SQL.
7. All grader tests pass via root `pnpm test`.
8. TypeScript strict mode, no `any` in `packages/shared`, lints clean.

## 12. Future roadmap (not v1 — do not build)

Multi-user + auth (schema is ready), JS sandbox graders (run user code against test cases), optional LLM feedback pass behind `ANTHROPIC_API_KEY`, spaced repetition queue, problem packs (import/export JSON), authoring UI, streaks. Problem count grows from 10 as Alex gives feedback — seeding is upsert-by-slug to make that painless.
