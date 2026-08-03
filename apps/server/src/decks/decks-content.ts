import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

import type { DeckCard, HandbookSource } from '@hone/shared';

import { SERVER_ROOT } from '../common/paths';

/**
 * `packages/decks` is content, not code: one JSON manifest per deck, no build
 * step, no import graph. Found by walking up from `apps/server`, the same way
 * the handbook, workouts, paths and modules packages are, so adding a deck is a
 * matter of dropping in a directory.
 */
function findDecksPackage(): string {
  let dir = SERVER_ROOT;
  for (let i = 0; i < 6; i += 1) {
    const candidate = join(dir, 'packages', 'decks');
    if (isDir(join(candidate, 'content'))) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('decks: could not locate packages/decks');
}

function isDir(path: string): boolean {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

export const DECKS_PACKAGE = findDecksPackage();
export const CONTENT_DIR = join(DECKS_PACKAGE, 'content');

/**
 * Nobody sits a deck any more, so these bounds are about authoring: a deck is
 * one contrast, checked against one page. Under four and the contrast wasn't
 * worth naming; over twelve and it has stopped being one, which is the point at
 * which the page it cites stops being able to check every card on it.
 */
export const MIN_CARDS = 4;
export const MAX_CARDS = 12;

/**
 * The caps are the format rather than a style note. A card is read in a few
 * seconds, and one that needs a paragraph is a handbook page: the deck already
 * cites one, so there is somewhere for the paragraph to go.
 */
export const MAX_FRONT = 160;
export const MAX_BACK = 400;

export interface DeckContent {
  slug: string;
  title: string;
  summary: string;
  order: number;
  minutes: number;
  /** `section/slug`. The page the deck drills, and where a claim is checked. */
  page: string;
  practise: string[];
  sources: HandbookSource[];
  verified: string;
  cards: DeckCard[];
}

/**
 * Read fresh every call, so a new deck needs no restart. Deck order is the
 * order the cards are served in, and it stops mattering the moment the client
 * shuffles them: what it still buys is a stable response to diff.
 */
export function listDecks(): DeckContent[] {
  if (!isDir(CONTENT_DIR)) return [];
  return readdirSync(CONTENT_DIR)
    .filter((entry) => existsSync(join(CONTENT_DIR, entry, 'deck.json')))
    .map((slug) => readDeck(slug))
    .sort((a, b) => a.order - b.order || a.slug.localeCompare(b.slug));
}

function readDeck(slug: string): DeckContent {
  const raw = readFileSync(join(CONTENT_DIR, slug, 'deck.json'), 'utf8');
  return parseDeck(raw, slug);
}

/** Split out from `readDeck` so the safety net can check a deck it makes up. */
export function parseDeck(raw: string, slug: string): DeckContent {
  const label = `decks: ${slug}/deck.json`;
  const fail = (why: string): never => {
    throw new Error(`${label} ${why}`);
  };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return fail(`is not valid JSON: ${(error as { message?: string }).message ?? 'unknown'}`);
  }

  const meta = parsed as Partial<DeckContent>;
  if (meta.slug !== slug) fail(`declares slug "${String(meta.slug)}"`);
  if (!meta.title?.trim()) fail('has no title');
  if (!meta.summary?.trim()) fail('has no summary');
  if (!Number.isFinite(meta.order)) fail('has no numeric order');
  if (!Number.isFinite(meta.minutes) || (meta.minutes as number) <= 0) {
    fail('has no positive minutes');
  }

  // A deck cites a page rather than teaching the material again, and that page
  // is what makes a card checkable. So it is required, not optional.
  if (!meta.page?.trim()) fail('names no page');
  if (!/^[^/]+\/[^/]+$/.test(meta.page as string)) {
    fail(`references the page "${String(meta.page)}", which is not section/slug`);
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

  const cards = Array.isArray(meta.cards) ? meta.cards : [];
  if (cards.length < MIN_CARDS || cards.length > MAX_CARDS) {
    fail(`has ${cards.length} cards, and a deck is ${MIN_CARDS} to ${MAX_CARDS}`);
  }

  const seen = new Set<string>();
  const clean = cards.map((card, index) => readCard(card, index, seen, fail));

  return {
    slug,
    title: meta.title as string,
    summary: meta.summary as string,
    order: meta.order as number,
    minutes: meta.minutes as number,
    page: (meta.page as string).trim(),
    practise: meta.practise as string[],
    sources,
    verified: meta.verified as string,
    cards: clean,
  };
}

function readCard(
  card: DeckCard,
  index: number,
  seen: Set<string>,
  fail: (why: string) => never
): DeckCard {
  const at = `card ${index + 1}`;

  const id = card?.id?.trim() ?? '';
  if (!id) fail(`${at} has no id`);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id))
    fail(`${at} has the id "${id}", which is not kebab-case`);
  if (seen.has(id)) fail(`repeats the card id "${id}"`);
  seen.add(id);

  const front = card.front?.trim() ?? '';
  const back = card.back?.trim() ?? '';
  if (!front) fail(`${id} has no front`);
  if (!back) fail(`${id} has no back`);

  // One line each. A card that wants a second paragraph is a page.
  if (front.includes('\n')) fail(`${id} has a newline in its front`);
  if (back.includes('\n')) fail(`${id} has a newline in its back`);
  if (front.length > MAX_FRONT) fail(`${id} has a front of ${front.length}, over ${MAX_FRONT}`);
  if (back.length > MAX_BACK) fail(`${id} has a back of ${back.length}, over ${MAX_BACK}`);

  return { id, front, back };
}

/** The same normalisation the safety net uses to spot two cards asking one thing. */
export function normaliseFront(front: string): string {
  return front
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
