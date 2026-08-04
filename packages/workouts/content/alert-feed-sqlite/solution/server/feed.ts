import type { Db } from './db';
import type { AlertRow, FeedAlert, FeedPage, FeedQuery } from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/** Where the last page stopped: the sort key of its final row, in full. */
interface Cursor {
  createdAt: string;
  id: number;
}

/**
 * The alert feed: firing alerts, newest first, a page at a time. The cursor
 * names the row the last page ended on rather than counting how many rows have
 * gone past, so an alert firing or being acknowledged above the window moves
 * nothing the next page depends on.
 */
export function listAlerts(db: Db, query: FeedQuery = {}): FeedPage {
  const status = query.status ?? 'firing';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(query.limit ?? DEFAULT_LIMIT)));
  const after = readCursor(query.cursor);

  const columns = `SELECT id, service, message, status, created_at FROM alerts`;
  // (created_at, id) is compared left to right and stops at the first pair that
  // differs, which is the rule ORDER BY created_at DESC, id DESC sorts by. That
  // is what makes one condition mean "comes after this exact row", even where
  // thirty alerts share a timestamp.
  const rows = after
    ? db
        .prepare(
          `${columns}
            WHERE status = ?
              AND (created_at, id) < (?, ?)
            ORDER BY created_at DESC, id DESC
            LIMIT ?`
        )
        .all<AlertRow>(status, after.createdAt, after.id, limit)
    : db
        .prepare(
          `${columns}
            WHERE status = ?
            ORDER BY created_at DESC, id DESC
            LIMIT ?`
        )
        .all<AlertRow>(status, limit);

  const items = rows.map(toAlert);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor:
      items.length === limit && last
        ? writeCursor({ createdAt: last.createdAt, id: last.id })
        : null,
  };
}

function toAlert(row: AlertRow): FeedAlert {
  return {
    id: row.id,
    service: row.service,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
  };
}

/** Base64 so nobody is tempted to pick the cursor apart on the client. */
function writeCursor(value: Cursor): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function readCursor(cursor: string | null | undefined): Cursor | null {
  if (!cursor) return null;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as Partial<Cursor>;
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'number') return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}
