import type { Db } from './db';
import type { AlertRow, FeedAlert, FeedPage, FeedQuery } from './types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * The alert feed: firing alerts, newest first, a page at a time. The client
 * never reads the cursor. It keeps the one the last page came back with and
 * hands it over to ask for the next.
 */
export function listAlerts(db: Db, query: FeedQuery = {}): FeedPage {
  const status = query.status ?? 'firing';
  const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(query.limit ?? DEFAULT_LIMIT)));
  const from = readCursor(query.cursor);

  const rows = db
    .prepare(
      `SELECT id, service, message, status, created_at
         FROM alerts
        WHERE status = ?
        ORDER BY created_at DESC
        LIMIT ?
       OFFSET ?`
    )
    .all<AlertRow>(status, limit, from);

  const items = rows.map(toAlert);

  return {
    items,
    nextCursor: items.length === limit ? writeCursor({ from: from + items.length }) : null,
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
function writeCursor(value: { from: number }): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

function readCursor(cursor: string | null | undefined): number {
  if (!cursor) return 0;
  try {
    const decoded = Buffer.from(cursor, 'base64url').toString('utf8');
    const parsed = JSON.parse(decoded) as { from?: number };
    return Math.max(0, Math.trunc(parsed.from ?? 0));
  } catch {
    return 0;
  }
}
