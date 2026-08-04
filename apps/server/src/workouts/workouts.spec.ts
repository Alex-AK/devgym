import { cpSync, mkdtempSync, rmSync } from 'node:fs';
import { symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, describe, expect, it } from 'vitest';

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
    // The most checkpoints available, so the timing assertion below has the
    // widest margin it can get and does not turn into a coin flip in CI.
    const manifest = [...manifests].sort((a, b) => b.checkpoints.length - a.checkpoints.length)[0];

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
      // And it is actually cheaper, which is the reason the feature exists.
      expect(one.durationMs).toBeLessThan(full.durationMs);
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
    it('passes every checkpoint from its solution', async () => {
      const result = await runCheckpoints(build(manifest.slug, 'solution'), manifest);
      expect(result.crashed, `${manifest.slug} crashed: ${result.crashed}`).toBeNull();
      const failed = result.checkpoints.filter((c) => c.status !== 'passed');
      expect(
        failed.map((c) => `${c.id}: ${c.failure ?? 'not run'}`).join('\n'),
        `${manifest.slug} solution should pass every checkpoint`
      ).toBe('');
    }, 120_000);

    it('leaves at least one checkpoint failing from its starting files', async () => {
      const result = await runCheckpoints(build(manifest.slug, 'files'), manifest);
      expect(result.crashed, `${manifest.slug} starter crashed: ${result.crashed}`).toBeNull();
      expect(
        result.passedCount,
        `${manifest.slug} starter already passes everything, so there is nothing to do`
      ).toBeLessThan(manifest.checkpoints.length);
    }, 120_000);
  });
});
