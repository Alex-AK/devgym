import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { CurrentUserService } from '../common/current-user.service';
import { type AppDb, openAppDatabase, runMigrations } from '../db/client';
import { ProgressService } from '../progress/progress.service';
import { openPracticeDatabase } from '../seed/practice-db';
import { problemSeeds } from '../seed/problems.seed';
import { seedAll } from '../seed/seed';
import { ProblemsService } from './problems.service';

const dir = mkdtempSync(join(tmpdir(), 'devgym-queue-'));
const practicePath = join(dir, 'practice.db');

let db: AppDb;
let sqlite: SqliteDatabase;
let practiceDb: SqliteDatabase;
let problems: ProblemsService;
let progress: ProgressService;

const firstSlugOf = (category: string): string =>
  problemSeeds.find((seed) => seed.category === category)?.slug ?? '';

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
    expect(next?.slug).toBe(problemSeeds[0]?.slug);
    expect(next?.queueSize).toBe(problemSeeds.length);
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
    expect(problems.next(undefined, 'next')?.queueSize).toBe(problemSeeds.length);
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

  it('wraps around with next and prev', async () => {
    const scope = { category: 'dom' } as const;
    const first = problems.next(undefined, 'next', scope)?.slug ?? '';
    const back = problems.next(first, 'prev', scope)?.slug;
    const forwardAgain = problems.next(back, 'next', scope)?.slug;
    expect(forwardAgain).toBe(first);
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
