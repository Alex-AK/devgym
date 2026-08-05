import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:net';
import type { AddressInfo, Server } from 'node:net';
import { tmpdir } from 'node:os';
import { delimiter, join } from 'node:path';

import type { WorkoutCheckpoint, WorkoutManifest, WorkoutRequirement } from '@hone/shared';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { unmetRequirements } from './requirements';
import {
  assertManifestValid,
  listManifests,
  RUNTIME_MODULES,
  SCAFFOLD_DIR,
} from './workout-content';
import { runCheckpoints } from './workout-runner';

/**
 * A workout may require something this repo does not ship, and the price of that
 * is graceful absence: nothing may fail because a laptop has no Mongo. Both
 * halves are proved here, and neither depends on what is installed on the
 * machine running the suite. The present case is a stub executable on a `PATH`
 * this file prepends to and a socket this file opens; the absent case is a name
 * nothing can plausibly answer to.
 *
 * A requirement names a binary, a port, or both, and the port it names is the
 * port the suites are handed. That handoff is proved the only way it can be, by
 * a fixture suite reading it inside the spawned run.
 */

const ABSENT = 'hone-fixture-binary-that-does-not-exist';
const STUB = 'hone-fixture-daemon';

const scratch: string[] = [];
const listeners: Server[] = [];
const originalPath = process.env.PATH;
const originalPorts = process.env.HONE_REQUIRED_PORTS;

/** One trivially passing checkpoint: what matters is whether it ran at all. */
const OK_SUITE = `import { expect, it } from 'vitest';

it('ran', () => {
  expect(1 + 1).toBe(2);
});
`;

/** Read inside the spawned run, which is the only place the handoff is visible. */
const portSuite = (expected: string): string => `import { expect, it } from 'vitest';

it('is handed the ports the workout declared, and only those', () => {
  expect(process.env.HONE_REQUIRED_PORTS).toBe('${expected}');
});
`;

const CHECKPOINTS: WorkoutCheckpoint[] = [
  { id: 'ran', title: 'The suites ran', testFile: 'tests/checkpoints/01-ok.test.ts' },
];

function requirement(
  overrides: Partial<Pick<WorkoutRequirement, 'binary' | 'install' | 'port' | 'reason'>> = {}
): WorkoutRequirement {
  return {
    binary: ABSENT,
    install: 'brew install nothing',
    reason: 'The fixture needs a binary nobody has.',
    ...overrides,
  };
}

/** The other shape: a port, and nothing said about `PATH` at all. */
function portRequirement(port: number): WorkoutRequirement {
  return {
    port,
    install: 'brew services start nothing',
    reason: 'The fixture needs something answering a socket.',
  };
}

/** The same layout `materialise` produces, minus the editable files. */
function buildFixture(suite: string = OK_SUITE): string {
  const workspace = mkdtempSync(join(tmpdir(), 'hone-requires-'));
  scratch.push(workspace);

  cpSync(SCAFFOLD_DIR, workspace, { recursive: true });
  mkdirSync(join(workspace, 'tests', 'checkpoints'), { recursive: true });
  writeFileSync(join(workspace, 'tests', 'checkpoints', '01-ok.test.ts'), suite);
  symlinkSync(RUNTIME_MODULES, join(workspace, 'node_modules'), 'dir');

  return workspace;
}

/** A port with a listener on it, or one with nothing behind it. */
async function reservePort(keepListening: boolean): Promise<number> {
  const server = createServer();
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;

  if (keepListening) listeners.push(server);
  else await new Promise<void>((resolve) => server.close(() => resolve()));

  return port;
}

beforeAll(() => {
  // An executable this repo certainly does not ship, on a PATH entry this file
  // owns. That makes "installed" as deterministic as "missing", where asking
  // for something real would only prove what this machine happens to have.
  const bin = mkdtempSync(join(tmpdir(), 'hone-requires-bin-'));
  scratch.push(bin);
  writeFileSync(join(bin, STUB), '#!/bin/sh\nexit 0\n');
  chmodSync(join(bin, STUB), 0o755);
  process.env.PATH = `${bin}${delimiter}${originalPath ?? ''}`;
});

afterAll(() => {
  process.env.PATH = originalPath;
  if (originalPorts === undefined) delete process.env.HONE_REQUIRED_PORTS;
  else process.env.HONE_REQUIRED_PORTS = originalPorts;
  for (const server of listeners) server.close();
  for (const dir of scratch) rmSync(dir, { recursive: true, force: true });
});

describe('checking what a workout requires', () => {
  it('reports a binary that is not on PATH as not installed', async () => {
    const [unmet] = await unmetRequirements([requirement()]);

    expect(unmet?.state).toBe('not-installed');
    expect(unmet?.message).toContain(ABSENT);
    expect(unmet?.message).toContain('brew install nothing');
  });

  it('reports nothing missing when the binary is there', async () => {
    expect(await unmetRequirements([requirement({ binary: STUB })])).toEqual([]);
  });

  /**
   * The common case, and the reason the check is two questions rather than one:
   * a Postgres you installed months ago and have not started today is present on
   * PATH and no use, and "install it" would be the wrong sentence.
   */
  it('separates a binary that is there from a service that is not answering', async () => {
    const port = await reservePort(false);
    const [unmet] = await unmetRequirements([requirement({ binary: STUB, port })]);

    expect(unmet?.state).toBe('not-running');
    expect(unmet?.message).toContain(`127.0.0.1:${String(port)}`);
    expect(unmet?.message).toContain('Start it');
  });

  it('is satisfied when the binary is there and something answers the port', async () => {
    const port = await reservePort(true);

    expect(await unmetRequirements([requirement({ binary: STUB, port })])).toEqual([]);
  });

  /**
   * The case a binary cannot express. What a workout reaching a daemon needs is
   * something speaking the protocol on a port, and a container or an app bundle
   * serves one with nothing on `PATH`, so the message may not send that reader
   * off to install a second copy of what they are already running.
   */
  it('reports a port nothing answers, and says nothing about PATH', async () => {
    const port = await reservePort(false);
    const [unmet] = await unmetRequirements([portRequirement(port)]);

    expect(unmet?.state).toBe('not-running');
    expect(unmet?.binary).toBeUndefined();
    expect(unmet?.message).toContain(`127.0.0.1:${String(port)}`);
    expect(unmet?.message).toContain('brew services start nothing');
    expect(unmet?.message).not.toContain('PATH');
  });

  it('is satisfied by a port alone, whatever is or is not on PATH', async () => {
    const port = await reservePort(true);

    expect(await unmetRequirements([portRequirement(port)])).toEqual([]);
  });

  it('finds nothing to check when a workout declares nothing', async () => {
    expect(await unmetRequirements(undefined)).toEqual([]);
  });
});

describe('running a workout that requires something absent', () => {
  it('skips before the suites start, and reports no checkpoint as passing', async () => {
    // A workspace that does not exist: spawning vitest here would crash, so a
    // run that comes back clean is proof the suites were never started.
    const run = await runCheckpoints(join(tmpdir(), 'hone-requires-no-such-workspace'), {
      checkpoints: CHECKPOINTS,
      requires: [requirement()],
    });

    expect(run.skipped).toContain(ABSENT);
    expect(run.crashed).toBeNull();
    expect(run.passedCount).toBe(0);
    expect(run.checkpoints.map((checkpoint) => checkpoint.status)).toEqual(['not-run']);
  });

  /**
   * The other half, and the one that keeps the safety net load bearing: a
   * requirement that is met changes nothing, so declaring one is never a way to
   * stop a checkpoint running.
   */
  it('runs normally when the requirement is met', async () => {
    const run = await runCheckpoints(buildFixture(), {
      checkpoints: CHECKPOINTS,
      requires: [requirement({ binary: STUB })],
    });

    expect(run.skipped).toBeNull();
    expect(run.crashed, `the fixture crashed: ${run.crashed}`).toBeNull();
    expect(run.passedCount).toBe(1);
  }, 120_000);

  it('leaves a workout that requires nothing alone', async () => {
    const run = await runCheckpoints(buildFixture(), { checkpoints: CHECKPOINTS });

    expect(run.skipped).toBeNull();
    expect(run.passedCount).toBe(1);
  }, 120_000);
});

/**
 * The port a workout is checked on and the port its suites connect to have to be
 * one value. They were two: presence was proved on the declared port while the
 * suites read `PGPORT`, so a shell with `PGPORT=5433` in it checked 5432 and
 * connected to 5433, and the failure looked like the exercise.
 */
describe('the port a workout declared', () => {
  it('reaches the suites that were checked against it', async () => {
    const port = await reservePort(true);
    const run = await runCheckpoints(buildFixture(portSuite(String(port))), {
      checkpoints: CHECKPOINTS,
      requires: [portRequirement(port)],
    });

    expect(run.crashed, `the fixture crashed: ${run.crashed}`).toBeNull();
    expect(run.skipped).toBeNull();
    expect(run.checkpoints[0]?.failure).toBeNull();
    expect(run.passedCount).toBe(1);
  }, 120_000);

  /**
   * Written every run, exactly as `HONE_SETUP_FILE` is. A workout that declared
   * nothing has to see nothing, or the ambient value this test plants is the
   * one it would connect to.
   */
  it('is empty for a workout that declared none, whatever the environment holds', async () => {
    process.env.HONE_REQUIRED_PORTS = '5433';
    const run = await runCheckpoints(buildFixture(portSuite('')), { checkpoints: CHECKPOINTS });

    expect(run.crashed, `the fixture crashed: ${run.crashed}`).toBeNull();
    expect(run.checkpoints[0]?.failure).toBeNull();
    expect(run.passedCount).toBe(1);
  }, 120_000);
});

describe('the manifest safety net', () => {
  const base = listManifests()[0];
  if (!base) throw new Error('workouts: no manifest to hang a requirement off');

  const withRequires = (requires: WorkoutManifest['requires']): WorkoutManifest => ({
    ...base,
    requires,
  });

  it('accepts a bare binary with an install line, a reason and a port', () => {
    expect(() =>
      assertManifestValid(
        withRequires([requirement({ binary: 'postgres', port: 5432 })]),
        base.slug
      )
    ).not.toThrow();
  });

  it('accepts a port with no binary, which is what a daemon actually needs', () => {
    expect(() =>
      assertManifestValid(withRequires([portRequirement(5432)]), base.slug)
    ).not.toThrow();
  });

  /**
   * The one shape neither half can check: a workout saying it needs something
   * and never saying what, which would be met on every machine and mean nothing
   * on any of them.
   */
  it('refuses a requirement naming neither a binary nor a port', () => {
    const nothing = { install: 'brew install nothing', reason: 'It needs something.' };

    expect(() => assertManifestValid(withRequires([nothing as never]), base.slug)).toThrow(
      /neither a binary nor a port/
    );
  });

  it('refuses an empty list, which is what leaving the field out means', () => {
    expect(() => assertManifestValid(withRequires([]), base.slug)).toThrow(/empty requires/);
  });

  /**
   * The way this field could be faked. A path resolves against the repo rather
   * than against PATH, so it would declare a requirement that is met or unmet
   * regardless of what the machine has installed.
   */
  it('refuses a binary with a path in it', () => {
    expect(() =>
      assertManifestValid(
        withRequires([requirement({ binary: './node_modules/.bin/vitest' })]),
        base.slug
      )
    ).toThrow(/bare name on PATH/);
  });

  it('refuses a requirement with no install line', () => {
    expect(() =>
      assertManifestValid(withRequires([requirement({ install: '  ' })]), base.slug)
    ).toThrow(/no install line/);
  });

  it('refuses a requirement with no reason', () => {
    expect(() =>
      assertManifestValid(withRequires([requirement({ reason: '' })]), base.slug)
    ).toThrow(/no reason/);
  });

  it('refuses a port that is not a port', () => {
    expect(() =>
      assertManifestValid(withRequires([requirement({ port: 70000 })]), base.slug)
    ).toThrow(/which is not a port/);
  });

  it('leaves a manifest without requires alone', () => {
    expect(() => assertManifestValid(withRequires(undefined), base.slug)).not.toThrow();
  });
});
