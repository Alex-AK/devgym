import { cpSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { WorkoutCheckpoint, WorkoutManifest } from '@hone/shared';
import { afterAll, describe, expect, it } from 'vitest';

import {
  assertManifestValid,
  listManifests,
  RUNTIME_MODULES,
  SCAFFOLD_DIR,
} from './workout-content';
import { runCheckpoints } from './workout-runner';

/**
 * A workout may say two things about how its suites run: the zone they run in,
 * and one setup file to register a global the environment does not have. Both
 * go through the runner rather than through a config file the workout owns, so
 * what is proved here is that the declaration arrives and that declaring
 * nothing changes nothing.
 *
 * The fixture is written at run time rather than committed, because a
 * checkpoint suite on disk under `src/` would be collected by this package's own
 * test run, where there is no scaffold and no zone.
 */

/** Never the host's own zone, so a passing zone assertion means the zone moved. */
const HOST_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
const ZONE = HOST_ZONE === 'America/New_York' ? 'Europe/Berlin' : 'America/New_York';

const ZONE_SUITE = `import { expect, it } from 'vitest';

it('runs in the zone the workout asked for', () => {
  expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('${ZONE}');
});

it('can see a DST boundary, which a fake clock cannot supply', () => {
  const summer = new Date('2024-10-26T12:00:00Z').getTimezoneOffset();
  const winter = new Date('2024-11-30T12:00:00Z').getTimezoneOffset();
  expect(summer).not.toBe(winter);
});
`;

/** A .tsx suite lands in the jsdom project, which is where the stub is missing. */
const STUB_SUITE = `import { expect, it } from 'vitest';

it('has the global the setup file registered', () => {
  expect(typeof globalThis.ResizeObserver).toBe('function');
});
`;

const SETUP_FILE = `class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = NoopResizeObserver;
`;

const CHECKPOINTS: WorkoutCheckpoint[] = [
  {
    id: 'zone',
    title: 'The suites run in the declared zone',
    testFile: 'tests/checkpoints/01-zone.test.ts',
  },
  {
    id: 'stub',
    title: 'The setup file registered its global',
    testFile: 'tests/checkpoints/02-stub.test.tsx',
  },
];

const scratch: string[] = [];

afterAll(() => {
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

/** The same layout `materialise` produces, minus the editable files. */
function buildFixture(): string {
  const workspace = mkdtempSync(join(tmpdir(), 'hone-test-run-'));
  scratch.push(workspace);

  cpSync(SCAFFOLD_DIR, workspace, { recursive: true });
  mkdirSync(join(workspace, 'tests', 'checkpoints'), { recursive: true });
  writeFileSync(join(workspace, 'tests', 'checkpoints', '01-zone.test.ts'), ZONE_SUITE);
  writeFileSync(join(workspace, 'tests', 'checkpoints', '02-stub.test.tsx'), STUB_SUITE);
  writeFileSync(join(workspace, 'tests', 'setup.ts'), SETUP_FILE);
  symlinkSync(RUNTIME_MODULES, join(workspace, 'node_modules'), 'dir');

  return workspace;
}

describe('a workout that configures its test run', () => {
  it('gets the zone it declared and the setup file it declared', async () => {
    const run = await runCheckpoints(buildFixture(), {
      checkpoints: CHECKPOINTS,
      testRun: { timezone: ZONE, setupFile: 'tests/setup.ts' },
    });

    expect(run.crashed, `the fixture crashed: ${run.crashed}`).toBeNull();
    const failed = run.checkpoints.filter((c) => c.status !== 'passed');
    expect(
      failed.map((c) => `${c.id}: ${c.failure ?? 'not run'}`).join('\n'),
      'both checkpoints should pass once the workout has declared its test run'
    ).toBe('');
  }, 120_000);

  it('leaves a workout that declares nothing exactly as it was', async () => {
    const run = await runCheckpoints(buildFixture(), { checkpoints: CHECKPOINTS });

    expect(run.crashed, `the fixture crashed: ${run.crashed}`).toBeNull();
    // The same two suites, unchanged: the host is in neither the declared zone
    // nor holding a ResizeObserver, so both fail without the declaration.
    expect(run.passedCount).toBe(0);
  }, 120_000);
});

describe('the manifest safety net', () => {
  const base = listManifests()[0];
  if (!base) throw new Error('workouts: no manifest to hang a testRun off');

  const withTestRun = (testRun: WorkoutManifest['testRun']): WorkoutManifest => ({
    ...base,
    testRun,
  });

  it('refuses a zone that does not exist', () => {
    expect(() => assertManifestValid(withTestRun({ timezone: 'Mars/Olympus' }), base.slug)).toThrow(
      /unknown timezone/
    );
  });

  /**
   * The failure this check exists for. Intl matches a zone name case
   * insensitively and TZ does not, so a workout spelled this way runs at a
   * fixed offset with no DST transition and its checkpoints go quiet rather
   * than red.
   */
  it('refuses a zone spelled in a case TZ will not match', () => {
    expect(() =>
      assertManifestValid(withTestRun({ timezone: 'America/New_york' }), base.slug)
    ).toThrow(/spelled "America\/New_York"/);
  });

  it('accepts a canonical zone', () => {
    expect(() =>
      assertManifestValid(withTestRun({ timezone: 'America/New_York' }), base.slug)
    ).not.toThrow();
  });

  it('refuses a setup file outside tests/', () => {
    expect(() =>
      assertManifestValid(withTestRun({ setupFile: 'src/setup.ts' }), base.slug)
    ).toThrow(/outside tests\//);
  });

  it('refuses a setup file the suites would also collect as a checkpoint', () => {
    expect(() =>
      assertManifestValid(withTestRun({ setupFile: 'tests/setup.test.ts' }), base.slug)
    ).toThrow(/collected as a suite/);
  });

  it('refuses a setup file that is not there', () => {
    expect(() =>
      assertManifestValid(withTestRun({ setupFile: 'tests/no-such-setup.ts' }), base.slug)
    ).toThrow(/missing tests\/no-such-setup.ts/);
  });

  it('leaves a manifest without a testRun alone', () => {
    expect(() => assertManifestValid(withTestRun(undefined), base.slug)).not.toThrow();
  });
});
