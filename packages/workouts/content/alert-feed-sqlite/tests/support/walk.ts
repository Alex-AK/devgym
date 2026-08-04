import type { Db } from '../../src/server/db';
import { listAlerts } from '../../src/server/feed';
import type { FeedPage } from '../../src/server/types';

interface WalkOptions {
  limit?: number;
  /** Called after each page is read, which is where the feed gets to move. */
  between?: (page: FeedPage, index: number) => void;
}

/**
 * Page through the firing feed from the top, following the cursor each page
 * hands back, and collect every id handed over.
 */
export function walkFeed(db: Db, options: WalkOptions = {}): number[] {
  const limit = options.limit ?? 20;
  const seen: number[] = [];
  let cursor: string | null = null;

  for (let index = 0; index < 60; index += 1) {
    const page = listAlerts(db, { status: 'firing', limit, cursor });
    seen.push(...page.items.map((alert) => alert.id));
    options.between?.(page, index);
    cursor = page.nextCursor;
    if (!cursor) return seen;
  }

  throw new Error('the feed handed back 60 pages and still had a cursor: it never ends');
}

/** The ids handed over more than once, each named once. */
export function repeats(ids: number[]): number[] {
  return [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
}

export const byNumber = (a: number, b: number): number => a - b;
