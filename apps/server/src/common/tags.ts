import { type Tag, TAGS } from '@devgym/shared';

/**
 * Read the JSON tag column, keeping only tags this build knows about. A row
 * written by a newer seed and read by older code should lose the tag it cannot
 * interpret, not crash the queue that happens to contain it.
 */
export function parseTags(raw: string): Tag[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((value): value is Tag => (TAGS as readonly unknown[]).includes(value));
}
