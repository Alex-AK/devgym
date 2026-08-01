import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { WorkoutManifest } from '@devgym/shared';

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
  assertValid(manifest, slug);
  return manifest;
}

export function readBrief(slug: string): string {
  return readFileSync(join(workoutDir(slug), 'brief.md'), 'utf8');
}

/**
 * Content is authored by hand, so the failure we care about is a typo that would
 * otherwise surface as a blank page or a checkpoint that can never pass.
 */
function assertValid(manifest: WorkoutManifest, slug: string): void {
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
}
