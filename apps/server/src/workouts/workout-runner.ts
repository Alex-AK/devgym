import { spawn } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

import type { WorkoutCheckpoint, WorkoutCheckpointResult, WorkoutRun } from '@devgym/shared';

import { RUNTIME_MODULES } from './workout-content';

/** A workout run is a timed exercise. Well past that, something is wrong. */
const RUN_TIMEOUT_MS = 90_000;
const RESULTS_FILE = 'results.json';

/** The subset of vitest's JSON reporter we depend on. */
interface VitestJson {
  testResults?: {
    name?: string;
    assertionResults?: {
      status?: string;
      title?: string;
      fullName?: string;
      failureMessages?: string[];
    }[];
  }[];
}

export interface RunOptions {
  /** Run this checkpoint's suite alone. Everything else carries over. */
  only?: string;
  /** The previous run, which is where carried-over results come from. */
  previous?: WorkoutRun | null;
}

/**
 * Run the workspace's checkpoint suites and map them back onto the manifest.
 *
 * One suite per checkpoint, matched by file path, so a checkpoint's status is
 * simply "did every test in its file pass". That keeps partial progress
 * meaningful: at ten minutes you can see two of four green.
 *
 * `only` narrows the spawn to one suite, which is what makes iterating on a
 * single failure cheap. The others are not re-run and so cannot be reported as
 * fresh: they carry their previous result with `stale` set, or fall back to
 * not-run. A full run always replaces the whole picture.
 */
export async function runCheckpoints(
  workspace: string,
  checkpoints: WorkoutCheckpoint[],
  options: RunOptions = {}
): Promise<WorkoutRun> {
  const only = options.only ?? null;
  const target = only ? checkpoints.find((checkpoint) => checkpoint.id === only) : undefined;
  const startedAt = Date.now();
  rmSync(join(workspace, RESULTS_FILE), { force: true });

  const outcome = await spawnVitest(workspace, target?.testFile);
  const durationMs = Date.now() - startedAt;
  const ranAt = new Date().toISOString();

  const carried = new Map(
    (options.previous?.checkpoints ?? []).map((result) => [result.id, result])
  );
  const ranHere = (checkpoint: WorkoutCheckpoint): boolean => !only || checkpoint.id === only;
  const carry = (checkpoint: WorkoutCheckpoint): WorkoutCheckpointResult => {
    const before = carried.get(checkpoint.id);
    return before && before.status !== 'not-run' ? { ...before, stale: true } : notRun(checkpoint);
  };

  const report = readReport(workspace);
  if (!report) {
    return {
      ranAt,
      durationMs,
      only,
      passedCount: 0,
      checkpoints: checkpoints.map((checkpoint) =>
        ranHere(checkpoint) ? notRun(checkpoint) : carry(checkpoint)
      ),
      // Vitest writes no report when the suite cannot even be collected, which
      // is the common case mid-workout: a syntax error or a bad import.
      crashed: firstUsefulLine(outcome.stderr || outcome.stdout) ?? 'The suite could not run.',
    };
  }

  const results = checkpoints.map((checkpoint) =>
    ranHere(checkpoint) ? summarise(checkpoint, report) : carry(checkpoint)
  );
  return {
    ranAt,
    durationMs,
    only,
    checkpoints: results,
    passedCount: results.filter((result) => result.status === 'passed' && !result.stale).length,
    crashed: null,
  };
}

function spawnVitest(
  workspace: string,
  testFile?: string
): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      join(RUNTIME_MODULES, '.bin', 'vitest'),
      [
        'run',
        '--reporter=json',
        `--outputFile=${RESULTS_FILE}`,
        // A positional argument is a path filter, so one suite runs alone.
        ...(testFile ? [testFile] : []),
      ],
      {
        cwd: workspace,
        // CI keeps vitest non-interactive and stops it watching.
        env: { ...process.env, CI: 'true', NO_COLOR: '1' },
        stdio: ['ignore', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    const timer = setTimeout(() => {
      child.kill('SIGKILL');
      stderr += '\nThe run exceeded its time limit and was stopped.';
    }, RUN_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timer);
      resolve({ stdout, stderr: `${stderr}\n${error.message}` });
    });
    child.on('close', () => {
      clearTimeout(timer);
      resolve({ stdout, stderr });
    });
  });
}

function readReport(workspace: string): VitestJson | null {
  try {
    return JSON.parse(readFileSync(join(workspace, RESULTS_FILE), 'utf8')) as VitestJson;
  } catch {
    return null;
  }
}

function summarise(checkpoint: WorkoutCheckpoint, report: VitestJson): WorkoutCheckpointResult {
  // vitest reports absolute paths; the manifest holds workout-relative ones.
  const suite = report.testResults?.find((file) => file.name?.endsWith(checkpoint.testFile));
  const assertions = suite?.assertionResults ?? [];

  if (!suite || assertions.length === 0) return notRun(checkpoint);

  const passed = assertions.filter((assertion) => assertion.status === 'passed').length;
  const failure = assertions.find((assertion) => assertion.status === 'failed');

  return {
    id: checkpoint.id,
    title: checkpoint.title,
    ...(checkpoint.hint ? { hint: checkpoint.hint } : {}),
    status: passed === assertions.length ? 'passed' : 'failed',
    testsPassed: passed,
    testsTotal: assertions.length,
    failure: failure ? describeFailure(failure) : null,
  };
}

function notRun(checkpoint: WorkoutCheckpoint): WorkoutCheckpointResult {
  return {
    id: checkpoint.id,
    title: checkpoint.title,
    ...(checkpoint.hint ? { hint: checkpoint.hint } : {}),
    status: 'not-run',
    testsPassed: 0,
    testsTotal: 0,
    failure: null,
  };
}

function describeFailure(assertion: { title?: string; failureMessages?: string[] }): string {
  const message = assertion.failureMessages?.[0] ?? '';
  // Keep the assertion and drop the stack: the frames are all inside vitest.
  const body = message
    .split('\n')
    .filter((line) => line.trim().length > 0 && !line.trim().startsWith('at '))
    .slice(0, 6)
    .join('\n');
  return assertion.title ? `${assertion.title}\n${body}`.trim() : body.trim();
}

function firstUsefulLine(output: string): string | null {
  const line = output
    .split('\n')
    .map((entry) => entry.trim())
    .find((entry) => entry.length > 0 && !entry.startsWith('at '));
  return line ? line.slice(0, 400) : null;
}
