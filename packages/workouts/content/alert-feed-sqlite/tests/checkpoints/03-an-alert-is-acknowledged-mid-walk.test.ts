import { beforeEach, describe, expect, it } from 'vitest';

import { acknowledgeAlert, createDb, type Db, firingAlertIds } from '../../src/server/db';
import { listAlerts } from '../../src/server/feed';
import { repeats, walkFeed } from '../support/walk';

let db: Db;

beforeEach(() => {
  db = createDb();
});

/** Every alert still firing that is newer than the given moment. */
function firingNewerThan(createdAt: string): number[] {
  return db
    .prepare("SELECT id FROM alerts WHERE status = 'firing' AND created_at > ?")
    .all<{ id: number }>(createdAt)
    .map((row) => row.id);
}

/** Walk the feed, acknowledging the first two alerts on each page as it goes. */
function walkWhileAcknowledging(): { seen: number[]; handled: Set<number> } {
  const handled = new Set<number>();
  const seen = walkFeed(db, {
    between: (page) => {
      for (const alert of page.items.slice(0, 2)) {
        acknowledgeAlert(db, alert.id);
        handled.add(alert.id);
      }
    },
  });
  return { seen, handled };
}

describe('an alert acknowledged between two pages', () => {
  it('does not step the next page over an alert nobody has read', () => {
    const first = listAlerts(db, { limit: 5 });
    acknowledgeAlert(db, first.items[0].id);
    acknowledgeAlert(db, first.items[1].id);
    const second = listAlerts(db, { limit: 5, cursor: first.nextCursor });

    const handedOver = new Set([...first.items, ...second.items].map((alert) => alert.id));
    const bottom = second.items[second.items.length - 1].createdAt;
    const missed = firingNewerThan(bottom).filter((id) => !handedOver.has(id));

    expect(
      missed,
      `${missed.length} alerts sit above the bottom of page 2 and were on neither page`
    ).toEqual([]);
  });

  it('still shows every alert nobody got to', () => {
    const before = firingAlertIds(db);
    const { seen, handled } = walkWhileAcknowledging();
    const missed = before.filter((id) => !handled.has(id) && !seen.includes(id));

    expect(missed, `${missed.length} alerts were on no page at all`).toEqual([]);
  });

  it('hands over no alert twice while the feed is being worked through', () => {
    expect(repeats(walkWhileAcknowledging().seen), 'an alert came back on two pages').toEqual([]);
  });
});
