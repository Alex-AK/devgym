import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { isOptInCategory } from '@hone/shared';
import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { CurrentUserService } from '../common/current-user.service';
import { type AppDb, openAppDatabase, runMigrations } from '../db/client';
import { ProgressService } from '../progress/progress.service';
import { openPracticeDatabase } from '../seed/practice-db';
import { problemSeeds } from '../seed/problems.seed';
import { seedAll } from '../seed/seed';
import { ProblemsService } from './problems.service';

const dir = mkdtempSync(join(tmpdir(), 'hone-queue-'));
const practicePath = join(dir, 'practice.db');

let db: AppDb;
let sqlite: SqliteDatabase;
let practiceDb: SqliteDatabase;
let problems: ProblemsService;
let progress: ProgressService;

const firstSlugOf = (category: string): string =>
  problemSeeds.find((seed) => seed.category === category)?.slug ?? '';

/** What an unscoped queue actually deals: everything bar the opt-in categories. */
const dealt = problemSeeds.filter((seed) => !isOptInCategory(seed.category));

beforeEach(() => {
  sqlite?.close();
  practiceDb?.close();

  const handle = openAppDatabase(join(dir, `app-${Math.random().toString(36).slice(2)}.db`));
  db = handle.db;
  sqlite = handle.sqlite;
  runMigrations(db);
  seedAll(db, practicePath);
  practiceDb = openPracticeDatabase(practicePath);

  const currentUser = new CurrentUserService();
  problems = new ProblemsService(db, practiceDb, currentUser);
  progress = new ProgressService(db, currentUser);
});

afterAll(() => {
  sqlite?.close();
  practiceDb?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('practice queue', () => {
  it('starts at the first problem by position', async () => {
    const next = problems.next();
    expect(next?.slug).toBe(dealt[0]?.slug);
    expect(next?.queueSize).toBe(dealt.length);
  });

  it('narrows to a single category', async () => {
    const next = problems.next(undefined, 'next', { category: 'react' });
    expect(next?.category).toBe('react');
    expect(next?.queueSize).toBe(problemSeeds.filter((seed) => seed.category === 'react').length);
  });

  it('narrows to a single difficulty', async () => {
    const next = problems.next(undefined, 'next', { difficulty: 'hard' });
    expect(next?.difficulty).toBe('hard');
    expect(next?.queueSize).toBe(problemSeeds.filter((seed) => seed.difficulty === 'hard').length);
  });

  it('combines category and difficulty', async () => {
    const scope = { category: 'sql', difficulty: 'hard' } as const;
    const next = problems.next(undefined, 'next', scope);
    expect(next?.category).toBe('sql');
    expect(next?.difficulty).toBe('hard');
    expect(next?.queueSize).toBe(
      problemSeeds.filter((s) => s.category === 'sql' && s.difficulty === 'hard').length
    );
  });

  it('returns null when a scope has nothing left', async () => {
    expect(problems.next(undefined, 'next', { mode: 'review' })).toBeNull();
  });

  /**
   * The point of a tag: it selects across categories, which is the one thing
   * `category` cannot do. If a tag scope ever came back single-category, the
   * axis would have collapsed into the one it exists to be different from.
   */
  it('narrows to a tag, across the categories it cuts through', async () => {
    const tagged = problemSeeds.filter((seed) => seed.tags?.includes('reading'));
    const next = problems.next(undefined, 'next', { tag: 'reading' });

    expect(next?.queueSize).toBe(tagged.length);
    expect(new Set(tagged.map((seed) => seed.category)).size).toBeGreaterThan(1);
  });

  it('combines a tag with a category, which is an intersection and not a union', async () => {
    const scope = { tag: 'reading', category: 'sql' } as const;
    const next = problems.next(undefined, 'next', scope);

    expect(next?.category).toBe('sql');
    expect(next?.queueSize).toBe(
      problemSeeds.filter((seed) => seed.category === 'sql' && seed.tags?.includes('reading'))
        .length
    );
  });

  /**
   * Tags are an entrance, not a filter on the morning. The daily queue keeps
   * dealing tagged reps in their categories, because interleaving is what
   * retention wants and a tag is a posture you choose on purpose.
   */
  it('leaves the unscoped queue dealing every rep, tagged or not', async () => {
    expect(problems.next()?.queueSize).toBe(dealt.length);
  });

  /**
   * The opposite of a tag, and the reason they stayed two mechanisms: an
   * opt-in category is a track you sit down to, so the round robin never deals
   * it unless you name it.
   */
  it('keeps an opt-in category out of the unscoped queue', () => {
    expect(dealt.length, 'nothing is opting out, so this test proves nothing').toBeLessThan(
      problemSeeds.length
    );
    expect(problems.next()?.queueSize).toBe(dealt.length);
  });

  it('deals an opt-in category in full when the scope names it', () => {
    const scope = { category: 'dsa-patterns' } as const;
    const next = problems.next(undefined, 'next', scope);

    expect(next?.category).toBe('dsa-patterns');
    expect(next?.queueSize).toBe(
      problemSeeds.filter((seed) => seed.category === 'dsa-patterns').length
    );
  });

  /**
   * Opting out holds back what you have never touched, not your own history.
   * A rep you attempted and got wrong has to stay reachable, or review mode
   * would hide misses the app is counting on the dashboard.
   */
  it('keeps an opt-in rep in the queue once you have attempted it', async () => {
    const slug = firstSlugOf('dsa-patterns');
    await problems.submitAttempt(slug, 'const nope = 1;');

    expect(problems.next(undefined, 'next', { mode: 'review' })?.slug).toBe(slug);
    expect(problems.next()?.queueSize).toBe(dealt.length + 1);
  });

  it('keeps an opt-in rep in the queue once you have skipped it', () => {
    problems.skip(firstSlugOf('dsa-patterns'));
    expect(problems.next()?.queueSize).toBe(dealt.length + 1);
  });

  it('review mode surfaces problems you attempted and did not solve', async () => {
    const slug = firstSlugOf('react');
    await problems.submitAttempt(slug, 'definitely wrong');

    const next = problems.next(undefined, 'next', { mode: 'review' });
    expect(next?.slug).toBe(slug);
    expect(next?.queueSize).toBe(1);
  });

  it('review mode also surfaces problems you skipped without attempting', async () => {
    const slug = firstSlugOf('http');
    problems.skip(slug);

    const review = problems.next(undefined, 'next', { mode: 'review' });
    expect(review?.slug, 'a bare skip should count as missed').toBe(slug);
    expect(review?.queueSize).toBe(1);
  });

  it('drops a skipped problem out of review once it is finally solved', async () => {
    const skipped = firstSlugOf('http');
    problems.skip(skipped);
    expect(problems.next(undefined, 'next', { mode: 'review' })?.slug).toBe(skipped);

    const seed = problemSeeds.find((entry) => entry.slug === skipped);
    await problems.submitAttempt(skipped, seed?.canonicalAnswer ?? '');
    expect(problems.next(undefined, 'next', { mode: 'review' })).toBeNull();
  });

  it('drops an attempted problem out of review once it is solved', async () => {
    const seed = problemSeeds.find((entry) => entry.slug === 'js-find');
    await problems.submitAttempt('js-find', 'filter');
    expect(problems.next(undefined, 'next', { mode: 'review' })?.slug).toBe('js-find');

    await problems.submitAttempt('js-find', seed?.canonicalAnswer ?? 'find');
    expect(problems.next(undefined, 'next', { mode: 'review' })).toBeNull();
  });

  it('sends a skipped problem to the back of its queue', async () => {
    const first = problems.next()?.slug ?? '';
    const result = problems.skip(first);

    expect(result.status).toBe('skipped');
    expect(result.next?.slug).not.toBe(first);
    // Still in the queue, just last.
    expect(problems.next()?.slug).not.toBe(first);
    expect(problems.next(undefined, 'next')?.queueSize).toBe(dealt.length);
  });

  it('keeps a skip inside the active session scope', async () => {
    const first = problems.next(undefined, 'next', { category: 'react' })?.slug ?? '';
    const result = problems.skip(first, { category: 'react' });
    expect(result.next?.category).toBe('react');
  });

  it('removes solved problems from the queue', async () => {
    const before = problems.next()?.queueSize ?? 0;
    const seed = problemSeeds.find((entry) => entry.slug === 'js-find');
    await problems.submitAttempt('js-find', seed?.canonicalAnswer ?? 'find');
    expect(problems.next()?.queueSize).toBe(before - 1);
  });

  it('steps forward and back without wrapping past the ends', async () => {
    const scope = { category: 'dom' } as const;
    const first = problems.next(undefined, 'next', scope)?.slug ?? '';
    const second = problems.next(first, 'next', scope)?.slug ?? '';
    expect(second).not.toBe(first);
    expect(problems.next(second, 'prev', scope)?.slug).toBe(first);

    // prev at the front stays put rather than jumping to the hardest problem.
    expect(problems.next(first, 'prev', scope)?.slug).toBe(first);
  });

  it('does not send you to the end of the queue after solving the problem you were on', async () => {
    const seed = problemSeeds.find((entry) => entry.slug === 'js-find');
    await problems.submitAttempt('js-find', seed?.canonicalAnswer ?? 'find');

    // The anchor has left the queue, so this takes the position fallback path.
    const back = problems.next('js-find', 'prev');
    const last = dealt[dealt.length - 1];
    expect(back?.slug).not.toBe(last?.slug);
    expect(back?.difficulty).toBe('easy');
  });
});

describe('reset all', () => {
  it('clears progress but keeps attempt history by default', async () => {
    await problems.submitAttempt('js-find', 'filter');
    await problems.submitAttempt('js-find', 'find');
    expect(progress.summary().solved).toBe(1);

    const result = progress.resetAll(false);
    expect(result.attemptsDeleted).toBe(0);
    expect(result.problemsReset).toBeGreaterThan(0);

    const after = progress.summary();
    expect(after.solved).toBe(0);
    expect(after.totalAttempts).toBe(2);
    expect(after.hasActivity).toBe(true);
  });

  it('returns to the zero state when history is cleared too', async () => {
    await problems.submitAttempt('js-find', 'find');

    const result = progress.resetAll(true);
    expect(result.attemptsDeleted).toBe(1);

    const after = progress.summary();
    expect(after.hasActivity).toBe(false);
    expect(after.totalAttempts).toBe(0);
    expect(after.solved).toBe(0);
    expect(after.missed).toBe(0);
  });

  it('counts a wrong attempt and a bare skip as missed', async () => {
    await problems.submitAttempt('js-find', 'filter');
    await problems.submitAttempt(firstSlugOf('http'), 'nonsense');
    problems.skip(firstSlugOf('dom'));
    expect(progress.summary().missed).toBe(3);
  });

  it('stops counting a problem as missed once it is solved', async () => {
    problems.skip('js-find');
    expect(progress.summary().missed).toBe(1);

    const seed = problemSeeds.find((entry) => entry.slug === 'js-find');
    await problems.submitAttempt('js-find', seed?.canonicalAnswer ?? 'find');
    expect(progress.summary().missed).toBe(0);
  });
});
