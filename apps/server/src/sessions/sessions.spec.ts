import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { Database as SqliteDatabase } from 'better-sqlite3';
import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { CurrentUserService } from '../common/current-user.service';
import { type AppDb, openAppDatabase, runMigrations } from '../db/client';
import { ProblemsService } from '../problems/problems.service';
import { ProgressService } from '../progress/progress.service';
import { openPracticeDatabase } from '../seed/practice-db';
import { problemSeeds } from '../seed/problems.seed';
import { seedAll } from '../seed/seed';
import { SessionsService } from './sessions.service';

const dir = mkdtempSync(join(tmpdir(), 'devgym-session-'));
const practicePath = join(dir, 'practice.db');

let db: AppDb;
let sqlite: SqliteDatabase;
let practiceDb: SqliteDatabase;
let problems: ProblemsService;
let sessions: SessionsService;

const answerFor = (slug: string): string =>
  problemSeeds.find((seed) => seed.slug === slug)?.canonicalAnswer ?? '';

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
  sessions = new SessionsService(db, currentUser, problems);
});

afterAll(() => {
  sqlite?.close();
  practiceDb?.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('sessions', () => {
  it('pins the requested number of problems from the queue head', async () => {
    const session = sessions.create({ size: 5 });
    expect(session.total).toBe(5);
    expect(session.remaining).toBe(5);
    expect(session.items.map((i) => i.slug)).toEqual(
      problemSeeds.slice(0, 5).map((seed) => seed.slug)
    );
    expect(session.nextSlug).toBe(problemSeeds[0]?.slug);
  });

  it('defaults to ten and clamps out-of-range sizes', async () => {
    expect(sessions.create({}).total).toBe(10);
    expect(sessions.create({ size: 0 }).total).toBe(10);
    expect(sessions.create({ size: 9999 }).total).toBe(50);
  });

  it('respects a category scope', async () => {
    const session = sessions.create({ size: 5, category: 'react' });
    expect(session.items.every((i) => i.category === 'react')).toBe(true);
    expect(session.scope.category).toBe('react');
  });

  /** Fifteen minutes of reading is a session, which is what the tag is for. */
  it('respects a tag scope, and survives a reload of it', async () => {
    const session = sessions.create({ size: 5, tag: 'reading' });

    expect(session.scope.tag).toBe('reading');
    expect(session.total).toBe(5);
    expect(new Set(session.items.map((item) => item.category)).size).toBeGreaterThan(1);
    // The scope is persisted, not recomputed: a reload must describe the same run.
    expect(sessions.active()?.scope.tag).toBe('reading');
  });

  it('takes what it can when the scope has fewer problems than asked for', async () => {
    const hardDom = problemSeeds.filter((s) => s.category === 'dom' && s.difficulty === 'hard');
    const session = sessions.create({ size: 10, category: 'dom', difficulty: 'hard' });
    expect(session.total).toBe(hardDom.length);
  });

  it('marks an item solved only when solved during the session', async () => {
    const session = sessions.create({ size: 3 });
    const slug = session.items[0]?.slug ?? '';
    await problems.submitAttempt(slug, answerFor(slug));

    const after = sessions.active();
    expect(after?.solved).toBe(1);
    expect(after?.remaining).toBe(2);
    expect(after?.items[0]?.status).toBe('solved');
    expect(after?.nextSlug).toBe(session.items[1]?.slug);
  });

  it('marks an item skipped when skipped during the session', async () => {
    const session = sessions.create({ size: 3 });
    const slug = session.items[0]?.slug ?? '';
    problems.skip(slug);

    const after = sessions.active();
    expect(after?.skipped).toBe(1);
    expect(after?.items[0]?.status).toBe('skipped');
    expect(after?.remaining).toBe(2);
  });

  it('does not count a skip that happened before the session started', async () => {
    // Scoped to one category so the skipped problem, which sinks to the back of
    // the queue, is still inside the session window.
    const scope = { category: 'dom' } as const;
    const first = problems.next(undefined, 'next', scope)?.slug ?? '';
    problems.skip(first, scope);

    const session = sessions.create({ size: 20, ...scope });
    const item = session.items.find((i) => i.slug === first);
    expect(item, 'the skipped problem should still be in the session').toBeDefined();
    expect(item?.status, 'a stale skip should not pre-complete an item').toBe('pending');
    expect(session.remaining).toBe(session.total);
  });

  it('sends a problem skipped during the session to the back of the next one', async () => {
    const scope = { category: 'dom' } as const;
    const session = sessions.create({ size: 20, ...scope });
    const first = session.items[0]?.slug ?? '';
    problems.skip(first, scope);
    sessions.finish(session.id);

    const tomorrow = sessions.create({ size: 20, ...scope });
    expect(tomorrow.items.at(-1)?.slug, 'a skip defers the problem, it does not drop it').toBe(
      first
    );
    expect(tomorrow.items[0]?.status).toBe('pending');
  });

  it('lets a skipped item be solved later in the same session', async () => {
    const session = sessions.create({ size: 3 });
    const slug = session.items[0]?.slug ?? '';
    problems.skip(slug);
    expect(sessions.active()?.items[0]?.status).toBe('skipped');

    await problems.submitAttempt(slug, answerFor(slug));
    const after = sessions.active();
    expect(after?.items[0]?.status).toBe('solved');
    expect(after?.skipped).toBe(0);
    expect(after?.solved).toBe(1);
  });

  it('reports no next slug once every item is done', async () => {
    const session = sessions.create({ size: 2 });
    for (const item of session.items) await problems.submitAttempt(item.slug, answerFor(item.slug));

    const after = sessions.active();
    expect(after?.remaining).toBe(0);
    expect(after?.nextSlug).toBeNull();
  });

  it('starting a new session closes the previous one', async () => {
    const first = sessions.create({ size: 2 });
    sessions.create({ size: 2 });

    expect(sessions.detail(first.id).finishedAt).not.toBeNull();
    expect(sessions.active()?.id).not.toBe(first.id);
  });

  it('finish is idempotent and freezes the elapsed clock', async () => {
    const session = sessions.create({ size: 2 });
    const finished = sessions.finish(session.id);
    expect(finished.finishedAt).not.toBeNull();

    const again = sessions.finish(session.id);
    expect(again.finishedAt).toBe(finished.finishedAt);
    expect(sessions.active()).toBeNull();
  });

  it('walks down the list across consecutive sessions', async () => {
    const monday = sessions.create({ size: 3 });
    for (const item of monday.items) await problems.submitAttempt(item.slug, answerFor(item.slug));

    const tuesday = sessions.create({ size: 3 });
    const overlap = tuesday.items.filter((i) => monday.items.some((m) => m.slug === i.slug));
    expect(overlap, 'solved problems should not come back tomorrow').toHaveLength(0);
  });

  it('is cleared by a full progress reset', async () => {
    const session = sessions.create({ size: 3 });
    await problems.submitAttempt(
      session.items[0]?.slug ?? '',
      answerFor(session.items[0]?.slug ?? '')
    );
    expect(sessions.active()).not.toBeNull();

    new ProgressService(db, new CurrentUserService()).resetAll(true);

    expect(sessions.active(), 'a stale session must not survive a reset').toBeNull();
    expect(sessions.latest()).toBeNull();
  });

  it('exposes the latest session after it is finished', async () => {
    const session = sessions.create({ size: 2 });
    sessions.finish(session.id);
    expect(sessions.active()).toBeNull();
    expect(sessions.latest()?.id).toBe(session.id);
  });
});
