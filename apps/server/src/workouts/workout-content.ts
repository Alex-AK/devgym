import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { WorkoutManifest } from '@hone/shared';

import { SERVER_ROOT } from '../common/paths';

/**
 * `packages/workouts` is content, not code: no build step, no import graph. The
 * server finds it by walking up from `apps/server`, so adding a workout is a
 * matter of dropping in a directory.
 */
function findWorkoutsPackage(): string {
  let dir = SERVER_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'packages', 'workouts');
    if (isDir(join(candidate, 'content'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('workouts: could not locate packages/workouts');
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const WORKOUTS_PACKAGE = findWorkoutsPackage();
export const CONTENT_DIR = join(WORKOUTS_PACKAGE, 'content');
export const SCAFFOLD_DIR = join(WORKOUTS_PACKAGE, 'scaffold');
/**
 * Workspaces symlink their `node_modules` here. That is what lets a workout
 * import the real drizzle-orm, the real testing-library, the real anything:
 * pnpm has already built this directory from the package's dependencies.
 */
export const RUNTIME_MODULES = join(WORKOUTS_PACKAGE, 'node_modules');

export function workoutDir(slug: string): string {
  return join(CONTENT_DIR, slug);
}

/** Read fresh every call, so a new workout directory needs no restart. */
export function listManifests(): WorkoutManifest[] {
  if (!isDir(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((entry) => existsSync(join(CONTENT_DIR, entry, 'workout.json')))
    .map((slug) => readManifest(slug))
    .sort((a, b) => a.minutes - b.minutes || a.slug.localeCompare(b.slug));
}

export function readManifest(slug: string): WorkoutManifest {
  const raw = readFileSync(join(workoutDir(slug), 'workout.json'), 'utf8');
  const manifest = JSON.parse(raw) as WorkoutManifest;
  assertManifestValid(manifest, slug);
  return manifest;
}

export function readBrief(slug: string): string {
  return readFileSync(join(workoutDir(slug), 'brief.md'), 'utf8');
}

/**
 * Content is authored by hand, so the failure we care about is a typo that would
 * otherwise surface as a blank page or a checkpoint that can never pass.
 */
export function assertManifestValid(manifest: WorkoutManifest, slug: string): void {
  const fail = (why: string): never => {
    throw new Error(`workouts: ${slug}/workout.json ${why}`);
  };

  if (manifest.slug !== slug) fail(`declares slug "${manifest.slug}"`);
  if (!manifest.title?.trim()) fail('has no title');
  if (!Number.isFinite(manifest.minutes) || manifest.minutes <= 0) fail('has no usable minutes');
  if (!Array.isArray(manifest.checkpoints) || manifest.checkpoints.length === 0) {
    fail('has no checkpoints');
  }
  if (!Array.isArray(manifest.editable) || manifest.editable.length === 0) {
    fail('lists no editable files');
  }

  const seen = new Set<string>();
  for (const checkpoint of manifest.checkpoints) {
    if (seen.has(checkpoint.id)) fail(`repeats checkpoint id "${checkpoint.id}"`);
    seen.add(checkpoint.id);
    if (!existsSync(join(workoutDir(slug), checkpoint.testFile))) {
      fail(`points checkpoint "${checkpoint.id}" at a missing ${checkpoint.testFile}`);
    }
  }

  assertTestRunValid(manifest, slug, fail);
  assertRequiresValid(manifest, fail);
}

/**
 * A requirement is the one field that can stop a workout running, so what is
 * checked here is that it names something a machine can actually be missing.
 * A binary with a path in it would be the way to fake this: it would resolve
 * against the repo rather than against `PATH`, and declare a requirement that
 * is always met or never met regardless of what is installed.
 *
 * Either half is enough on its own and neither is optional in the sense that
 * matters: a requirement naming nothing is a workout declaring it needs
 * something and never saying what, which is the one shape that could not be
 * checked at all.
 */
function assertRequiresValid(manifest: WorkoutManifest, fail: (why: string) => never): void {
  const requires = manifest.requires;
  if (requires === undefined) return;

  if (!Array.isArray(requires) || requires.length === 0) {
    fail('declares an empty requires, which is what leaving it out means');
  }

  for (const requirement of requires) {
    const { binary, install, port, reason } = requirement;
    const named = binary === undefined ? 'a port-only requirement' : `requirement "${binary}"`;

    if (binary === undefined && port === undefined) {
      fail('declares a requirement naming neither a binary nor a port, so nothing can be missing');
    }
    if (binary !== undefined) {
      if (!binary.trim()) fail('declares a requirement with an empty binary');
      if (/[\\/]/.test(binary) || binary.includes('..')) {
        fail(`declares requirement binary "${binary}", which has to be a bare name on PATH`);
      }
    }
    if (!install?.trim()) fail(`declares ${named} with no install line`);
    if (!reason?.trim()) fail(`declares ${named} with no reason`);
    if (port !== undefined && (!Number.isInteger(port) || port < 1 || port > 65535)) {
      fail(`declares ${named} on port ${String(port)}, which is not a port`);
    }
  }
}

/**
 * Both fields fail quietly when they are wrong, which is why they are checked
 * here rather than left to the suite: a mis-spelled zone still produces dates,
 * and a setup file that is not there still lets every checkpoint run.
 */
function assertTestRunValid(
  manifest: WorkoutManifest,
  slug: string,
  fail: (why: string) => never
): void {
  const testRun = manifest.testRun;
  if (testRun === undefined) return;

  const { setupFile, timezone } = testRun;

  if (timezone !== undefined) {
    const canonical = canonicalZone(timezone);
    if (canonical === null) fail(`declares an unknown timezone "${timezone}"`);
    // `TZ` is matched against the zone database as spelled, where Intl is case
    // insensitive. `America/New_york` therefore does not fail: it yields a fixed
    // offset with no DST transition, deleting the boundary the workout is about.
    if (canonical !== timezone) {
      fail(`declares timezone "${timezone}", which TZ needs spelled "${canonical}"`);
    }
  }

  if (setupFile !== undefined) {
    if (!setupFile.startsWith('tests/') || setupFile.includes('..')) {
      fail(`points setupFile at "${setupFile}", which is outside tests/`);
    }
    if (/\.test\.tsx?$/.test(setupFile)) {
      fail(`names setupFile "${setupFile}", which would also be collected as a suite`);
    }
    if (!existsSync(join(workoutDir(slug), setupFile))) {
      fail(`points setupFile at a missing ${setupFile}`);
    }
  }
}

function canonicalZone(zone: string): string | null {
  try {
    return new Intl.DateTimeFormat('en-US', { timeZone: zone }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}
