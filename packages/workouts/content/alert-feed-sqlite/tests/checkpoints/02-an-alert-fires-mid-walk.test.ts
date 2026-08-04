import { beforeEach, describe, expect, it } from 'vitest';

import { addAlert, createDb, type Db, firingAlertIds } from '../../src/server/db';
import { listAlerts } from '../../src/server/feed';
import { repeats, walkFeed } from '../support/walk';

let db: Db;

beforeEach(() => {
  db = createDb();
});

/** Newer than anything the seed holds, so it lands at the top of the feed. */
const FIRST_ARRIVAL_AT = Date.UTC(2026, 5, 1, 9, 0, 0);

function arrival(index: number) {
  return {
    service: 'checkout-api',
    message: `error rate above 5% (${index})`,
    createdAt: new Date(FIRST_ARRIVAL_AT + index * 60_000).toISOString(),
  };
}

/** Walk the feed with one new alert firing after every page is read. */
function walkWithArrivals(): number[] {
  let arrivals = 0;
  return walkFeed(db, {
    between: () => {
      arrivals += 1;
      addAlert(db, arrival(arrivals));
    },
  });
}

describe('an alert firing between two pages', () => {
  it('does not push an alert that was on page 1 onto page 2', () => {
    const first = listAlerts(db, { limit: 20 });
    addAlert(db, arrival(1));
    const second = listAlerts(db, { limit: 20, cursor: first.nextCursor });

    const again = second.items
      .filter((alert) => first.items.some((seen) => seen.id === alert.id))
      .map((alert) => alert.id);

    expect(again, 'page 2 handed back an alert that was already on page 1').toEqual([]);
  });

  it('hands over no alert twice, however often the feed moves', () => {
    expect(repeats(walkWithArrivals()), 'an alert came back on two different pages').toEqual([]);
  });

  it('still shows every alert that was firing when the walk started', () => {
    const before = firingAlertIds(db);
    const seen = walkWithArrivals();
    const missed = before.filter((id) => !seen.includes(id));

    expect(missed, `${missed.length} alerts were on no page at all`).toEqual([]);
  });
});
