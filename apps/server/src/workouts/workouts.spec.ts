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
  const workspace = mkdtempSync(join(tmpdir(), `devgym-workout-${from}-`));
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

  describe.each(manifests.map((m) => [m.slug, m] as const))('%s', (_slug, manifest) => {
    it('passes every checkpoint from its solution', async () => {
      const result = await runCheckpoints(build(manifest.slug, 'solution'), manifest.checkpoints);
      expect(result.crashed, `${manifest.slug} crashed: ${result.crashed}`).toBeNull();
      const failed = result.checkpoints.filter((c) => c.status !== 'passed');
      expect(
        failed.map((c) => `${c.id}: ${c.failure ?? 'not run'}`).join('\n'),
        `${manifest.slug} solution should pass every checkpoint`
      ).toBe('');
    }, 120_000);

    it('leaves at least one checkpoint failing from its starting files', async () => {
      const result = await runCheckpoints(build(manifest.slug, 'files'), manifest.checkpoints);
      expect(result.crashed, `${manifest.slug} starter crashed: ${result.crashed}`).toBeNull();
      expect(
        result.passedCount,
        `${manifest.slug} starter already passes everything, so there is nothing to do`
      ).toBeLessThan(manifest.checkpoints.length);
    }, 120_000);
  });
});
