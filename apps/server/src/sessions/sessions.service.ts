import {
  CATEGORIES,
  type CreateSessionRequest,
  DEFAULT_SESSION_SIZE,
  DIFFICULTIES,
  MAX_SESSION_SIZE,
  type QueueScope,
  type SessionItem,
  type SessionItemStatus,
  type SessionResponse,
} from '@hone/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { CurrentUserService } from '../common/current-user.service';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { problemProgress, problems, sessionItems, sessions } from '../db/schema';
import { toQueueScope } from '../problems/dto';
import { ProblemsService } from '../problems/problems.service';

@Injectable()
export class SessionsService {
  constructor(
    @Inject(APP_DB) private readonly db: AppDb,
    private readonly currentUser: CurrentUserService,
    private readonly problemsService: ProblemsService
  ) {}

  /**
   * Pin the next `size` problems from the queue. Because solved problems leave
   * the queue, running this each morning walks steadily down the list.
   */
  create(request: CreateSessionRequest): SessionResponse {
    const userId = this.currentUser.getUserId();
    const size = clampSize(request.size);
    const scope: QueueScope = toQueueScope(request);

    // Only one session runs at a time; starting a new one closes the old.
    this.finishActive(userId);

    // Reviews first, then new material: retention beats fresh coverage when
    // both compete for the same ten slots.
    const due = scope.mode ? [] : this.problemsService.queueSlugs({ ...scope, mode: 'due' });
    const fresh = this.problemsService.queueSlugs(scope);
    const queue = [...due, ...fresh.filter((id) => !due.includes(id))].slice(0, size);
    const createdAt = new Date().toISOString();
    const baselines = new Map(
      this.db
        .select({
          problemId: problemProgress.problemId,
          solvedAt: problemProgress.solvedAt,
          lastSkippedAt: problemProgress.lastSkippedAt,
        })
        .from(problemProgress)
        .where(eq(problemProgress.userId, userId))
        .all()
        .map((row) => [row.problemId, row])
    );

    const [row] = this.db
      .insert(sessions)
      .values({
        userId,
        category: writeList(scope.category),
        difficulty: writeList(scope.difficulty),
        mode: scope.mode ?? null,
        tag: scope.tag ?? null,
        createdAt,
      })
      .returning({ id: sessions.id })
      .all();

    const sessionId = row?.id;
    if (sessionId === undefined) throw new Error('sessions: insert returned no id');

    if (queue.length > 0) {
      this.db
        .insert(sessionItems)
        .values(
          queue.map((problemId, index) => ({
            sessionId,
            problemId,
            position: index + 1,
            baselineSolvedAt: baselines.get(problemId)?.solvedAt ?? null,
            baselineSkippedAt: baselines.get(problemId)?.lastSkippedAt ?? null,
          }))
        )
        .run();
    }

    return this.detail(sessionId);
  }

  /** The session in progress, or null. */
  active(): SessionResponse | null {
    const userId = this.currentUser.getUserId();
    const [row] = this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(eq(sessions.userId, userId), isNull(sessions.finishedAt)))
      .orderBy(desc(sessions.id))
      .limit(1)
      .all();
    return row ? this.detail(row.id) : null;
  }

  /** The most recent session, finished or not — powers the summary screen. */
  latest(): SessionResponse | null {
    const userId = this.currentUser.getUserId();
    const [row] = this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(eq(sessions.userId, userId))
      .orderBy(desc(sessions.id))
      .limit(1)
      .all();
    return row ? this.detail(row.id) : null;
  }

  finish(id: number): SessionResponse {
    const userId = this.currentUser.getUserId();
    this.db
      .update(sessions)
      .set({ finishedAt: new Date().toISOString() })
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId), isNull(sessions.finishedAt)))
      .run();
    return this.detail(id);
  }

  detail(id: number): SessionResponse {
    const userId = this.currentUser.getUserId();
    const [session] = this.db
      .select()
      .from(sessions)
      .where(and(eq(sessions.id, id), eq(sessions.userId, userId)))
      .limit(1)
      .all();
    if (!session) throw new NotFoundException(`No session with id ${id}`);

    const rows = this.db
      .select({
        slug: problems.slug,
        title: problems.title,
        category: problems.category,
        difficulty: problems.difficulty,
        relevance: problems.relevance,
        position: sessionItems.position,
        solvedAt: problemProgress.solvedAt,
        lastSkippedAt: problemProgress.lastSkippedAt,
        baselineSolvedAt: sessionItems.baselineSolvedAt,
        baselineSkippedAt: sessionItems.baselineSkippedAt,
      })
      .from(sessionItems)
      .innerJoin(problems, eq(problems.id, sessionItems.problemId))
      .leftJoin(
        problemProgress,
        and(
          eq(problemProgress.problemId, sessionItems.problemId),
          eq(problemProgress.userId, userId)
        )
      )
      .where(eq(sessionItems.sessionId, id))
      .orderBy(sessionItems.position)
      .all();

    const items: SessionItem[] = rows.map((row) => ({
      slug: row.slug,
      title: row.title,
      category: row.category,
      difficulty: row.difficulty,
      relevance: row.relevance,
      position: row.position,
      status: outcomeFor(row),
    }));

    const solved = items.filter((item) => item.status === 'solved').length;
    const skipped = items.filter((item) => item.status === 'skipped').length;
    const pending = items.filter((item) => item.status === 'pending');
    const until = session.finishedAt ? Date.parse(session.finishedAt) : Date.now();

    return {
      id: session.id,
      createdAt: session.createdAt,
      finishedAt: session.finishedAt,
      scope: toQueueScope({
        category: readList(session.category, CATEGORIES),
        difficulty: readList(session.difficulty, DIFFICULTIES),
        ...(session.mode ? { mode: session.mode } : {}),
        ...(session.tag ? { tag: session.tag } : {}),
      }),
      items,
      total: items.length,
      solved,
      skipped,
      remaining: pending.length,
      nextSlug: pending[0]?.slug ?? null,
      elapsedSeconds: Math.max(0, Math.round((until - Date.parse(session.createdAt)) / 1000)),
    };
  }

  private finishActive(userId: number): void {
    this.db
      .update(sessions)
      .set({ finishedAt: new Date().toISOString() })
      .where(and(eq(sessions.userId, userId), isNull(sessions.finishedAt)))
      .run();
  }
}

/** Nothing scoped is null, not `[]`: an unscoped session reads as one either way. */
function writeList(values: readonly string[] | undefined): string | null {
  return values && values.length > 0 ? JSON.stringify(values) : null;
}

/**
 * Read a scope column, keeping only values this build knows. Written as JSON,
 * but a session pinned before the axes took lists holds a bare `sql`, and that
 * has to keep describing the run it described the day it was pinned.
 */
function readList<T extends string>(raw: string | null, allowed: readonly T[]): T[] {
  if (raw === null || raw === '') return [];
  const known = (value: unknown): value is T => (allowed as readonly unknown[]).includes(value);

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return known(raw) ? [raw] : [];
  }
  if (!Array.isArray(parsed)) return known(parsed) ? [parsed] : [];
  return parsed.filter(known);
}

function clampSize(size: number | undefined): number {
  if (!size || !Number.isFinite(size)) return DEFAULT_SESSION_SIZE;
  return Math.min(MAX_SESSION_SIZE, Math.max(1, Math.floor(size)));
}

/**
 * An item counts as done only if its progress changed *since* the session was
 * pinned. A problem skipped last week is still pending today.
 */
function outcomeFor(row: {
  solvedAt: string | null;
  lastSkippedAt: string | null;
  baselineSolvedAt: string | null;
  baselineSkippedAt: string | null;
}): SessionItemStatus {
  if (row.solvedAt && row.solvedAt !== row.baselineSolvedAt) return 'solved';
  if (row.lastSkippedAt && row.lastSkippedAt !== row.baselineSkippedAt) return 'skipped';
  return 'pending';
}
