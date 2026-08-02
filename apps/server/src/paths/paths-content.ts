import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import {
  AUTHORED_PATH_STEP_KINDS,
  type AuthoredPathStepKind,
  PATH_STEP_KINDS,
  type PathStep,
} from '@devgym/shared';

import { SERVER_ROOT } from '../common/paths';

/**
 * `packages/paths` is content, not code: one JSON manifest per session, no
 * build step, no import graph. Found by walking up from `apps/server`, the same
 * way the handbook and workouts packages are, so adding an hour is a matter of
 * dropping in a directory.
 */
function findPathsPackage(): string {
  let dir = SERVER_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'packages', 'paths');
    if (isDir(join(candidate, 'content'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('paths: could not locate packages/paths');
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const PATHS_PACKAGE = findPathsPackage();
export const CONTENT_DIR = join(PATHS_PACKAGE, 'content');

/**
 * Read, then prove, then build. A session's steps run in this order and the
 * loader enforces it, because a rep that arrives before the page explaining it
 * is the daily queue's job rather than this one's.
 */
const PHASE: Record<AuthoredPathStepKind, number> = { page: 0, problem: 1, workout: 2 };

export interface PathContent {
  slug: string;
  title: string;
  question: string;
  summary: string;
  order: number;
  minutes: number;
  steps: PathStep[];
}

/** Read fresh every call, so a new session needs no restart. */
export function listPaths(): PathContent[] {
  if (!isDir(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((entry) => existsSync(join(CONTENT_DIR, entry, 'path.json')))
    .map((slug) => readPath(slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function readPath(slug: string): PathContent {
  const raw = readFileSync(join(CONTENT_DIR, slug, 'path.json'), 'utf8');
  return parsePath(raw, slug);
}

/** Split out from `readPath` so the safety net can check a session it makes up. */
export function parsePath(raw: string, slug: string): PathContent {
  const label = `paths: ${slug}/path.json`;
  const fail = (why: string): never => {
    throw new Error(`${label} ${why}`);
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return fail(`is not valid JSON: ${(error as { message?: string }).message ?? 'unknown'}`);
  }

  const meta = parsed as Partial<PathContent>;
  if (meta.slug !== slug) fail(`declares slug "${String(meta.slug)}"`);
  if (!meta.title?.trim()) fail('has no title');
  if (!meta.question?.trim()) fail('has no question');
  if (!meta.summary?.trim()) fail('has no summary');
  if (!Number.isFinite(meta.order)) fail('has no numeric order');
  if (!Number.isFinite(meta.minutes) || (meta.minutes as number) <= 0) {
    fail('has no positive minutes');
  }
  if (!Array.isArray(meta.steps) || meta.steps.length === 0) fail('has no steps');

  const steps = (meta.steps as PathStep[]).map((step, index) => readStep(step, index, fail));

  if (!steps.some((step) => step.kind === 'page')) fail('has no page to read');
  if (!steps.some((step) => step.kind === 'problem')) fail('has nothing to prove');

  let phase = 0;
  for (const step of steps) {
    const next = PHASE[step.kind as AuthoredPathStepKind];
    if (next < phase) fail(`puts a ${step.kind} step after a later phase: read, prove, then build`);
    phase = next;
  }

  return {
    slug,
    title: meta.title as string,
    question: meta.question as string,
    summary: meta.summary as string,
    order: meta.order as number,
    minutes: meta.minutes as number,
    steps,
  };
}

function readStep(step: PathStep, index: number, fail: (why: string) => never): PathStep {
  const at = `step ${index + 1}`;

  if (!PATH_STEP_KINDS.includes(step?.kind)) {
    fail(`${at} has an unknown kind "${String(step?.kind)}"`);
  }
  // `module` is a legal step the day modules exist, and one case in a switch
  // when they do. Until then a session naming one would resolve to nothing.
  if (!AUTHORED_PATH_STEP_KINDS.includes(step.kind as AuthoredPathStepKind)) {
    fail(`${at} is a "${step.kind}" step, which is reserved and not yet valid`);
  }
  if (!step.ref?.trim()) fail(`${at} points at nothing`);
  if (step.kind === 'page' && !/^[^/]+\/[^/]+$/.test(step.ref)) {
    fail(`${at} references the page "${step.ref}", which is not section/slug`);
  }
  if (step.kind !== 'page' && step.ref.includes('/')) {
    fail(`${at} references "${step.ref}", which should be a bare slug`);
  }
  if (step.note !== undefined && !step.note.trim()) fail(`${at} has an empty note`);

  const clean: PathStep = { kind: step.kind, ref: step.ref.trim() };
  if (step.note) clean.note = step.note.trim();
  return clean;
}
