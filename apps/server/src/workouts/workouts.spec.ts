import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkoutManifest, WorkoutRun } from '@hone/shared';
import { afterAll, describe, expect, it } from 'vitest';
import type { TestContext } from 'vitest';

import { skipReason, unmetRequirements } from './requirements';
import { listManifests, workoutDir } from './workout-content';
import { RUNTIME_MODULES, SCAFFOLD_DIR } from './workout-content';
import { runCheckpoints } from './workout-runner';

/**
 * The content safety net. Every workout has to be both winnable and not already
 * won: the solution passes every checkpoint, the starter fails at least one.
 * Without this, a broken workout only surfaces when you sit down to practise.
 */
const manifests = listManifests();
const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

function build(slug: string, from: 'files' | 'solution'): string {
  const workspace = mkdtempSync(join(tmpdir(), `hone-workout-${from}-`));
  scratch.push(workspace);

  const source = workoutDir(slug);
  cpSync(SCAFFOLD_DIR, workspace, { recursive: true });
  cpSync(join(source, 'files'), join(workspace, 'src'), { recursive: true });
  cpSync(join(source, 'tests'), join(workspace, 'tests'), { recursive: true });
  // The solution only carries the editable files, so it is laid over the starter.
  if (from === 'solution') {
    cpSync(join(source, 'solution'), join(workspace, 'src'), { recursive: true });
  }
  symlinkSync(RUNTIME_MODULES, join(workspace, 'node_modules'), 'dir');
  return workspace;
}

/**
 * How many tests a run actually executed. Carried-over results are somebody
 * else's work, so they do not count, and the numbers come from vitest's own
 * report rather than from a clock.
 */
function testsExecuted(run: WorkoutRun): number {
  return run.checkpoints
    .filter((checkpoint) => !checkpoint.stale)
    .reduce((total, checkpoint) => total + checkpoint.testsTotal, 0);
}

/**
 * A workout may need a binary this repo does not ship, and one of those must not
 * turn this suite red on a machine that has never installed it. Skipping is the
 * whole enabling requirement, so it is reported as a skip with the missing
 * binary named, never as a pass: vitest prints the note, and a workout that is
 * quietly never verified is visible in the run rather than hidden in it.
 *
 * This cannot be used to dodge a failure. Absence is what skips, so a workout
 * that declared something it does not need would be skipped everywhere,
 * including on the machine of whoever wrote it, and could not be practised
 * either: the runner refuses to start it for the same reason.
 */
async function skipIfUnavailable(manifest: WorkoutManifest, ctx: TestContext): Promise<void> {
  const missing = skipReason(await unmetRequirements(manifest.requires));
  if (missing) ctx.skip(`${manifest.slug}: ${missing}`);
}

describe('workout content', () => {
  it('finds at least one workout', () => {
    expect(manifests.length).toBeGreaterThan(0);
  });

  it('gives every checkpoint a distinct id and an existing suite', () => {
    // listManifests validates as it loads, so reaching here is most of the test.
    for (const manifest of manifests) {
      expect(new Set(manifest.checkpoints.map((c) => c.id)).size).toBe(manifest.checkpoints.length);
      expect(manifest.editable.every((path) => path.startsWith('src/'))).toBe(true);
    }
  });

  /**
   * Running one checkpoint has to stay cheaper than running them all and honest
   * about what it did not check. One workout is enough to prove the mechanism:
   * the per-workout suites below already prove every checkpoint runs.
   */
  describe('a single checkpoint', () => {
    // The most checkpoints available, so there is the most for a one-checkpoint
    // run to leave alone: the stale count and the tests-executed gap both get
    // their widest margin from it. Only from the workouts that need nothing
    // installed, because this is a test of the mechanism and it has to run on
    // every machine.
    const manifest = manifests
      .filter((candidate) => candidate.requires === undefined)
      .sort((a, b) => b.checkpoints.length - a.checkpoints.length)[0];

    it('runs alone, and carries the rest forward marked stale', async () => {
      if (!manifest) return;
      const workspace = build(manifest.slug, 'solution');
      const target = manifest.checkpoints[1] ?? manifest.checkpoints[0];
      if (!target) return;

      const full = await runCheckpoints(workspace, manifest);
      expect(full.only).toBeNull();
      expect(full.passedCount).toBe(manifest.checkpoints.length);

      const one = await runCheckpoints(workspace, manifest, {
        only: target.id,
        previous: full,
      });

      expect(one.only).toBe(target.id);
      expect(one.checkpoints.find((c) => c.id === target.id)?.stale).toBeUndefined();
      expect(one.checkpoints.filter((c) => c.stale).length).toBe(manifest.checkpoints.length - 1);
      // The whole point of the field: a carried-over pass is not a fresh one, so
      // one checkpoint can never total up to a cleared workout.
      expect(one.passedCount).toBe(1);
      // And it did less work, which is the reason the feature exists. Counted,
      // not timed: the two runs are minutes apart on a machine also running the
      // rest of `pnpm verify`, so comparing `durationMs` compares the load. What
      // the feature actually does is hand vitest one suite instead of every
      // suite, and the report says how many tests that came to.
      expect(testsExecuted(one)).toBeLessThan(testsExecuted(full));
    }, 240_000);

    it('reports not-run for the others when there is nothing to carry', async () => {
      if (!manifest) return;
      const target = manifest.checkpoints[0];
      if (!target) return;

      const one = await runCheckpoints(build(manifest.slug, 'solution'), manifest, {
        only: target.id,
      });

      expect(one.passedCount).toBe(1);
      for (const result of one.checkpoints.filter((c) => c.id !== target.id)) {
        expect(result.status).toBe('not-run');
        expect(result.stale).toBeUndefined();
      }
    }, 120_000);
  });

  describe.each(manifests.map((m) => [m.slug, m] as const))('%s', (_slug, manifest) => {
    it('passes every checkpoint from its solution', async (ctx) => {
      await skipIfUnavailable(manifest, ctx);
      const result = await runCheckpoints(build(manifest.slug, 'solution'), manifest);
      expect(result.crashed, `${manifest.slug} crashed: ${result.crashed}`).toBeNull();
      const failed = result.checkpoints.filter((c) => c.status !== 'passed');
      expect(
        failed.map((c) => `${c.id}: ${c.failure ?? 'not run'}`).join('\n'),
        `${manifest.slug} solution should pass every checkpoint`
      ).toBe('');
    }, 120_000);

    it('leaves at least one checkpoint failing from its starting files', async (ctx) => {
      await skipIfUnavailable(manifest, ctx);
      const result = await runCheckpoints(build(manifest.slug, 'files'), manifest);
      expect(result.crashed, `${manifest.slug} starter crashed: ${result.crashed}`).toBeNull();
      expect(
        result.passedCount,
        `${manifest.slug} starter already passes everything, so there is nothing to do`
      ).toBeLessThan(manifest.checkpoints.length);
    }, 120_000);
  });
});
