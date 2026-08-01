import type {
  WorkoutAttempt,
  WorkoutDetail,
  WorkoutFile,
  WorkoutManifest,
  WorkoutRun,
  WorkoutSummary,
} from '@devgym/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull } from 'drizzle-orm';

import { CurrentUserService } from '../common/current-user.service';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { workoutAttempts } from '../db/schema';
import { listManifests, readBrief, readManifest } from './workout-content';
import { runCheckpoints } from './workout-runner';
import {
  destroy,
  materialise,
  readEditable,
  readSolution,
  restoreEditable,
  workspacePath,
  writeEditable,
} from './workspace';

@Injectable()
export class WorkoutsService {
  constructor(
    @Inject(APP_DB) private readonly db: AppDb,
    private readonly currentUser: CurrentUserService
  ) {}

  list(): WorkoutSummary[] {
    const userId = this.currentUser.getUserId();
    const history = this.db
      .select()
      .from(workoutAttempts)
      .where(eq(workoutAttempts.userId, userId))
      .all();

    return listManifests().map((manifest) => {
      const mine = history.filter((row) => row.slug === manifest.slug);
      const best = mine.reduce((max, row) => Math.max(max, row.bestPassed), 0);
      const latest = mine
        .map((row) => row.startedAt)
        .sort()
        .at(-1);

      return {
        ...toSummary(manifest),
        bestCheckpointsPassed: mine.length > 0 ? best : null,
        lastAttemptedAt: latest ?? null,
      };
    });
  }

  detail(slug: string): WorkoutDetail {
    const manifest = this.requireManifest(slug);
    const summary = this.list().find((entry) => entry.slug === slug);
    const attempt = this.activeAttempt(slug);

    return {
      ...(summary ?? {
        ...toSummary(manifest),
        bestCheckpointsPassed: null,
        lastAttemptedAt: null,
      }),
      brief: readBrief(slug),
      editable: manifest.editable,
      checkpoints: manifest.checkpoints,
      attempt,
      solution: this.solutionIfEarned(manifest, attempt),
    };
  }

  /** Start the clock: materialise a fresh workspace and pin the start time. */
  start(slug: string): WorkoutDetail {
    const manifest = this.requireManifest(slug);
    const userId = this.currentUser.getUserId();

    // One attempt at a time per workout, mirroring how sessions work.
    this.finishActive(slug);

    const [row] = this.db
      .insert(workoutAttempts)
      .values({ userId, slug, startedAt: new Date().toISOString() })
      .returning({ id: workoutAttempts.id })
      .all();

    if (row?.id === undefined) throw new Error('workouts: insert returned no id');
    materialise(row.id, manifest);
    return this.detail(slug);
  }

  saveFile(slug: string, path: string, contents: string): WorkoutFile[] {
    const manifest = this.requireManifest(slug);
    const attempt = this.requireActiveAttempt(slug);
    writeEditable(attempt.id, manifest, path, contents);
    return readEditable(attempt.id, manifest);
  }

  /** Put one file back to how the workout shipped it. */
  resetFile(slug: string, path: string): WorkoutFile[] {
    const manifest = this.requireManifest(slug);
    const attempt = this.requireActiveAttempt(slug);
    writeEditable(attempt.id, manifest, path, restoreEditable(manifest, path));
    return readEditable(attempt.id, manifest);
  }

  async run(slug: string): Promise<WorkoutRun> {
    const manifest = this.requireManifest(slug);
    const attempt = this.requireActiveAttempt(slug);

    const result = await runCheckpoints(workspacePath(attempt.id), manifest.checkpoints);

    this.db
      .update(workoutAttempts)
      .set({
        lastRun: JSON.stringify(result),
        bestPassed: Math.max(attempt.bestPassed, result.passedCount),
      })
      .where(eq(workoutAttempts.id, attempt.id))
      .run();

    return result;
  }

  finish(slug: string): WorkoutDetail {
    this.requireManifest(slug);
    this.finishActive(slug);
    return this.detail(slug);
  }

  revealSolution(slug: string): WorkoutFile[] {
    const manifest = this.requireManifest(slug);
    const attempt = this.activeAttempt(slug);
    if (attempt) {
      this.db
        .update(workoutAttempts)
        .set({ solutionViewed: 1 })
        .where(eq(workoutAttempts.id, attempt.id))
        .run();
    }
    return readSolution(manifest);
  }

  private activeAttempt(slug: string): WorkoutAttempt | null {
    const manifest = this.requireManifest(slug);
    const row = this.rawActiveAttempt(slug);
    if (!row) return null;

    return {
      id: row.id,
      slug: row.slug,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      files: readEditable(row.id, manifest),
      lastRun: row.lastRun ? (JSON.parse(row.lastRun) as WorkoutRun) : null,
    };
  }

  private rawActiveAttempt(slug: string) {
    const userId = this.currentUser.getUserId();
    const [row] = this.db
      .select()
      .from(workoutAttempts)
      .where(
        and(
          eq(workoutAttempts.userId, userId),
          eq(workoutAttempts.slug, slug),
          isNull(workoutAttempts.finishedAt)
        )
      )
      .orderBy(desc(workoutAttempts.id))
      .limit(1)
      .all();
    return row;
  }

  private requireActiveAttempt(slug: string) {
    const row = this.rawActiveAttempt(slug);
    if (!row) throw new NotFoundException(`No workout in progress for "${slug}". Start it first.`);
    return row;
  }

  private finishActive(slug: string): void {
    const row = this.rawActiveAttempt(slug);
    if (!row) return;
    this.db
      .update(workoutAttempts)
      .set({ finishedAt: new Date().toISOString() })
      .where(eq(workoutAttempts.id, row.id))
      .run();
    // The workspace is disposable: the row keeps the score, disk gets it back.
    destroy(row.id);
  }

  /** Shown once every checkpoint passes, or once you have asked for it. */
  private solutionIfEarned(
    manifest: WorkoutManifest,
    attempt: WorkoutAttempt | null
  ): WorkoutFile[] | null {
    if (!attempt) return null;
    const row = this.rawActiveAttempt(manifest.slug);
    const allPassed = attempt.lastRun?.passedCount === manifest.checkpoints.length;
    return allPassed || row?.solutionViewed === 1 ? readSolution(manifest) : null;
  }

  private requireManifest(slug: string): WorkoutManifest {
    try {
      return readManifest(slug);
    } catch {
      throw new NotFoundException(`No workout with slug "${slug}"`);
    }
  }
}

function toSummary(
  manifest: WorkoutManifest
): Omit<WorkoutSummary, 'bestCheckpointsPassed' | 'lastAttemptedAt'> {
  return {
    slug: manifest.slug,
    title: manifest.title,
    kind: manifest.kind,
    minutes: manifest.minutes,
    difficulty: manifest.difficulty,
    relevance: manifest.relevance,
    stack: manifest.stack,
    summary: manifest.summary,
    focus: manifest.focus,
    checkpointCount: manifest.checkpoints.length,
  };
}
