import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { HandbookSource, ModuleStep } from '@devgym/shared';

import { SERVER_ROOT } from '../common/paths';
import { parseDocument, readString } from '../handbook/frontmatter';

/**
 * `packages/modules` is content, not code: a manifest and a markdown file per
 * step, no build step, no import graph. Found by walking up from `apps/server`,
 * the same way the handbook and workouts packages are.
 */
function findModulesPackage(): string {
  let dir = SERVER_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'packages', 'modules');
    if (isDir(join(candidate, 'content'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('modules: could not locate packages/modules');
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const MODULES_PACKAGE = findModulesPackage();
export const CONTENT_DIR = join(MODULES_PACKAGE, 'content');

export interface ModuleContent {
  slug: string;
  title: string;
  summary: string;
  order: number;
  minutes: number;
  practise: string[];
  sources: HandbookSource[];
  verified: string;
  steps: ModuleStep[];
}

/** Read fresh every call, so a new module needs no restart. */
export function listModules(): ModuleContent[] {
  if (!isDir(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((entry) => existsSync(join(CONTENT_DIR, entry, 'module.json')))
    .map((slug) => readModule(slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function readModule(slug: string): ModuleContent {
  const label = `modules: ${slug}/module.json`;
  const fail = (why: string): never => {
    throw new Error(`${label} ${why}`);
  };

  const raw = readFileSync(join(CONTENT_DIR, slug, 'module.json'), 'utf8');
  const meta = JSON.parse(raw) as Partial<ModuleContent>;

  if (meta.slug !== slug) fail(`declares slug "${String(meta.slug)}"`);
  if (!meta.title?.trim()) fail('has no title');
  if (!meta.summary?.trim()) fail('has no summary');
  if (!Number.isFinite(meta.order)) fail('has no numeric order');
  if (!Number.isFinite(meta.minutes) || (meta.minutes as number) <= 0) {
    fail('has no positive minutes');
  }
  if (!Array.isArray(meta.practise) || meta.practise.length === 0) {
    fail('lists nothing to practise');
  }
  const sources = Array.isArray(meta.sources) ? meta.sources : [];
  if (sources.length === 0) fail('cites no sources');
  for (const source of sources) {
    if (!source.author?.trim() || !source.title?.trim() || !source.url?.trim()) {
      fail('cites a source missing an author, a title or a url');
    }
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(meta.verified ?? '')) {
    fail('has a "verified" that is not YYYY-MM-DD');
  }

  const steps = listSteps(slug);
  if (steps.length === 0) fail('has no steps');

  return {
    slug,
    title: meta.title as string,
    summary: meta.summary as string,
    order: meta.order as number,
    minutes: meta.minutes as number,
    practise: meta.practise as string[],
    sources,
    verified: meta.verified as string,
    steps,
  };
}

/** Ordered by the filename prefix, which is the only thing the prefix is for. */
export function listSteps(slug: string): ModuleStep[] {
  const dir = join(CONTENT_DIR, slug);
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.md'))
    .sort()
    .map((entry) => parseStep(readFileSync(join(dir, entry), 'utf8'), slug, entry));
}

/**
 * A step is prose plus two tagged fences. The fences come out of the body,
 * because the snippet belongs in an editor and the assertions are the check:
 * rendering either of them as part of the prose would show the answer twice.
 */
export function parseStep(source: string, slug: string, filename: string): ModuleStep {
  const label = `modules: ${slug}/${filename}`;
  const fail = (why: string): never => {
    throw new Error(`${label} ${why}`);
  };

  const { data, body } = parseDocument(source, label);
  const title = readString(data, 'title', label);
  const predict = readString(data, 'predict', label);

  const code = fence(body, 'run');
  const asserts = fence(body, 'assert');
  if (code === null) fail('has no ```js run fence');
  if (asserts === null) fail('has no ```js assert fence');

  const assertions = (asserts as string)
    .split('\n')
    // One assertion per line. A trailing semicolon is a statement terminator
    // and this is an expression, so drop it rather than fail on it.
    .map((line) => line.trim().replace(/;$/, ''))
    .filter((line) => line !== '');
  if (assertions.length === 0) fail('has an empty ```js assert fence');

  return {
    // The numeric prefix orders the files and is not part of the identity, so
    // renumbering a module does not change anybody's links.
    id: filename.replace(/^\d+-/, '').replace(/\.md$/, ''),
    title,
    predict,
    body: stripFences(body).trim(),
    code: (code as string).trim(),
    assertions,
  };
}

const FENCE = (tag: string): RegExp => new RegExp('```js ' + tag + '\\n([\\s\\S]*?)```', 'm');

function fence(body: string, tag: string): string | null {
  return FENCE(tag).exec(body)?.[1] ?? null;
}

function stripFences(body: string): string {
  return body.replace(FENCE('run'), '').replace(FENCE('assert'), '');
}
