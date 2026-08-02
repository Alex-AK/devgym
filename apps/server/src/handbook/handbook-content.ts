import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { HandbookSource } from '@devgym/shared';

import { SERVER_ROOT } from '../common/paths';
import {
  parseDocument,
  readObjectList,
  readOptionalNumber,
  readString,
  readStringList,
} from './frontmatter';

/**
 * `packages/handbook` is content, not code: markdown with frontmatter, no build
 * step, no import graph. Found by walking up from `apps/server`, the same way
 * the workouts package is, so adding a page is a matter of dropping in a file.
 */
function findHandbookPackage(): string {
  let dir = SERVER_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'packages', 'handbook');
    if (isDir(join(candidate, 'content'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('handbook: could not locate packages/handbook');
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const HANDBOOK_PACKAGE = findHandbookPackage();
export const CONTENT_DIR = join(HANDBOOK_PACKAGE, 'content');

/**
 * The five-part shape from docs/content.md. Two parts live in frontmatter (the
 * question, and where to practise) because the app resolves them into links;
 * the other three are headings in the body, checked by exact text so pages stay
 * recognisably the same thing.
 */
export const REQUIRED_HEADINGS = ['## The model', '## Worked example', '## Traps'] as const;

/**
 * A shortlink is a citation that can rot or be repointed, and it hides who is
 * actually being credited. The vault this content draws on is full of them, so
 * the rule is mechanical rather than a habit: resolve it, or don't cite it.
 */
export const LINK_SHORTENERS = [
  'amzn.to',
  'bit.ly',
  'buff.ly',
  'cutt.ly',
  'dub.sh',
  'goo.gl',
  'is.gd',
  'lnkd.in',
  'ow.ly',
  'rb.gy',
  'rebrand.ly',
  'shorturl.at',
  't.co',
  'tinyurl.com',
  'trib.al',
  'youtu.be',
] as const;

export interface HandbookSectionMeta {
  slug: string;
  title: string;
  summary: string;
  order: number;
}

export interface HandbookPageContent {
  section: string;
  slug: string;
  title: string;
  question: string;
  practise: string[];
  sources: HandbookSource[];
  verified: string;
  order: number;
  /** Markdown, frontmatter stripped. */
  body: string;
}

/** Read fresh every call, so a new page needs no restart. */
export function listSections(): HandbookSectionMeta[] {
  if (!isDir(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((entry) => existsSync(join(CONTENT_DIR, entry, 'section.json')))
    .map((slug) => readSection(slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function readSection(slug: string): HandbookSectionMeta {
  const label = `handbook: ${slug}/section.json`;
  const raw = readFileSync(join(CONTENT_DIR, slug, 'section.json'), 'utf8');
  const meta = JSON.parse(raw) as Partial<HandbookSectionMeta>;

  if (meta.slug !== slug) throw new Error(`${label} declares slug "${String(meta.slug)}"`);
  if (!meta.title?.trim()) throw new Error(`${label} has no title`);
  if (!meta.summary?.trim()) throw new Error(`${label} has no summary`);
  if (!Number.isFinite(meta.order)) throw new Error(`${label} has no numeric order`);

  return { slug, title: meta.title, summary: meta.summary, order: meta.order as number };
}

export function listPages(section: string): HandbookPageContent[] {
  const dir = join(CONTENT_DIR, section);
  if (!isDir(dir)) return [];
  return readdirSync(dir)
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => readPage(section, entry.slice(0, -3)))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

export function allPages(): HandbookPageContent[] {
  return listSections().flatMap((section) => listPages(section.slug));
}

export function readPage(section: string, slug: string): HandbookPageContent {
  const source = readFileSync(join(CONTENT_DIR, section, `${slug}.md`), 'utf8');
  return parsePage(source, section, slug);
}

/** Split out from `readPage` so the safety net can check a page it makes up. */
export function parsePage(source: string, section: string, slug: string): HandbookPageContent {
  const label = `handbook: ${section}/${slug}.md`;
  const { data, body } = parseDocument(source, label);

  const page: HandbookPageContent = {
    section,
    slug,
    title: readString(data, 'title', label),
    question: readString(data, 'question', label),
    practise: readStringList(data, 'practise', label),
    sources: readSources(data, label),
    verified: readString(data, 'verified', label),
    // Reading order inside a section is authored, not alphabetical. Pages
    // without one sort last, which is a visible nudge rather than an error.
    order: readOptionalNumber(data, 'order', label) ?? 999,
    body,
  };

  assertValid(page, label);
  return page;
}

function readSources(data: Parameters<typeof readObjectList>[0], label: string): HandbookSource[] {
  return readObjectList(data, 'sources', label).map((entry, index) => {
    const at = `${label}: source ${index + 1}`;
    const { author, title, url } = entry;
    if (!author?.trim()) throw new Error(`${at} has no author`);
    if (!title?.trim()) throw new Error(`${at} has no title`);
    if (!url?.trim()) throw new Error(`${at} has no url`);
    return { author: author.trim(), title: title.trim(), url: url.trim() };
  });
}

/**
 * Content is hand-authored and mostly machine-written, so the failures worth
 * catching are the ones that would ship a page nobody can check: a claim with
 * no source behind it, a source nobody can follow, or a page missing the part
 * of the shape that makes it useful.
 */
function assertValid(page: HandbookPageContent, label: string): void {
  const fail = (why: string): never => {
    throw new Error(`${label} ${why}`);
  };

  if (!/^\d{4}-\d{2}-\d{2}$/.test(page.verified)) fail('has a "verified" that is not YYYY-MM-DD');
  if (Number.isNaN(Date.parse(page.verified))) fail(`has an unparseable verified date`);

  if (page.sources.length === 0) fail('cites no sources');
  for (const source of page.sources) {
    const host = hostOf(source.url);
    if (!host) fail(`cites "${source.title}" with a url that is not http(s)`);
    if (isShortener(host as string)) fail(`cites "${source.title}" through the shortener ${host}`);
  }

  if (page.practise.length === 0) fail('lists nothing to practise');

  for (const heading of REQUIRED_HEADINGS) {
    if (!hasHeading(page.body, heading)) fail(`is missing its "${heading}" section`);
  }
}

function hasHeading(body: string, heading: string): boolean {
  return body.split('\n').some((line) => line.trimEnd() === heading);
}

function hostOf(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.hostname : null;
  } catch {
    return null;
  }
}

export function isShortener(host: string): boolean {
  const bare = host.replace(/^www\./, '').toLowerCase();
  return LINK_SHORTENERS.some((domain) => bare === domain);
}
