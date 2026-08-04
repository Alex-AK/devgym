import { beforeEach, describe, expect, it } from 'vitest';

import { addAlert, BURST_CREATED_AT, createDb, type Db } from '../../src/server/db';
import { listAlerts } from '../../src/server/feed';
import { repeats, walkFeed } from '../support/walk';

let db: Db;

beforeEach(() => {
  db = createDb();
});

/** The alerts the notifier wrote in one go, all stamped the same millisecond. */
function burstIds(): number[] {
  return db
    .prepare('SELECT id FROM alerts WHERE created_at = ?')
    .all<{ id: number }>(BURST_CREATED_AT)
    .map((row) => row.id);
}

/** Walk the feed, with a thirty-first alert landing in the same millisecond. */
function walkThroughTheBurst(): number[] {
  return walkFeed(db, {
    between: (_page, index) => {
      if (index === 0) {
        addAlert(db, {
          service: 'checkout-api',
          message: 'health check failed on instance 31',
          createdAt: BURST_CREATED_AT,
        });
      }
    },
  });
}

describe('the thirty alerts that share a created_at', () => {
  it('runs across a page boundary, so a page has to stop in the middle of them', () => {
    const first = listAlerts(db, { limit: 20 });
    const last = first.items[first.items.length - 1];

    expect(burstIds()).toHaveLength(30);
    expect(last.createdAt, 'page 1 no longer ends inside the burst').toBe(BURST_CREATED_AT);
  });

  it('hands over every one of them, even when a thirty-first lands in the same millisecond', () => {
    const before = burstIds();
    const seen = walkThroughTheBurst();
    const missed = before.filter((id) => !seen.includes(id));

    expect(missed, `${missed.length} of the thirty were on no page at all`).toEqual([]);
  });

  it('hands none of them over twice', () => {
    expect(repeats(walkThroughTheBurst()), 'an alert came back on two different pages').toEqual([]);
  });
});
