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

/**
 * Run the workspace's checkpoint suites and map them back onto the manifest.
 *
 * One suite per checkpoint, matched by file path, so a checkpoint's status is
 * simply "did every test in its file pass". That keeps partial progress
 * meaningful: at ten minutes you can see two of four green.
 */
export async function runCheckpoints(
  workspace: string,
  checkpoints: WorkoutCheckpoint[]
): Promise<WorkoutRun> {
  const startedAt = Date.now();
  rmSync(join(workspace, RESULTS_FILE), { force: true });

  const outcome = await spawnVitest(workspace);
  const durationMs = Date.now() - startedAt;
  const ranAt = new Date().toISOString();

  const report = readReport(workspace);
  if (!report) {
    return {
      ranAt,
      durationMs,
      passedCount: 0,
      checkpoints: checkpoints.map((checkpoint) => notRun(checkpoint)),
      // Vitest writes no report when the suite cannot even be collected, which
      // is the common case mid-workout: a syntax error or a bad import.
      crashed: firstUsefulLine(outcome.stderr || outcome.stdout) ?? 'The suite could not run.',
    };
  }

  const results = checkpoints.map((checkpoint) => summarise(checkpoint, report));
  return {
    ranAt,
    durationMs,
    checkpoints: results,
    passedCount: results.filter((result) => result.status === 'passed').length,
    crashed: null,
  };
}

function spawnVitest(workspace: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn(
      join(RUNTIME_MODULES, '.bin', 'vitest'),
      ['run', '--reporter=json', `--outputFile=${RESULTS_FILE}`],
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
