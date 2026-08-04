import { beforeEach, describe, expect, it } from 'vitest';

import { createDb, type Db, firingAlertIds } from '../../src/server/db';
import { listAlerts } from '../../src/server/feed';
import { byNumber, repeats, walkFeed } from '../support/walk';

let db: Db;

beforeEach(() => {
  db = createDb();
});

describe('the feed on-call already had', () => {
  it('opens on twenty firing alerts', () => {
    const page = listAlerts(db);

    expect(page.items).toHaveLength(20);
    expect(page.items.every((alert) => alert.status === 'firing')).toBe(true);
  });

  it('puts the newest alert first', () => {
    const times = listAlerts(db).items.map((alert) => alert.createdAt);

    expect(times, 'the page is not in newest-first order').toEqual([...times].sort().reverse());
  });

  it('takes a smaller page off the same end of the feed', () => {
    const five = listAlerts(db, { limit: 5 });
    const twenty = listAlerts(db, { limit: 20 });

    expect(five.items.map((alert) => alert.id)).toEqual(
      twenty.items.slice(0, 5).map((alert) => alert.id)
    );
  });

  it('reads the acknowledged alerts when it is asked for those instead', () => {
    const page = listAlerts(db, { status: 'acknowledged' });

    expect(page.items).toHaveLength(20);
    expect(page.items.every((alert) => alert.status === 'acknowledged')).toBe(true);
  });

  it('runs out of pages at the end of the feed', () => {
    expect(walkFeed(db)).toHaveLength(firingAlertIds(db).length);
  });

  it('shows every firing alert exactly once while nothing is moving', () => {
    const seen = walkFeed(db);

    expect(repeats(seen), 'an alert came back on two different pages').toEqual([]);
    expect([...seen].sort(byNumber)).toEqual([...firingAlertIds(db)].sort(byNumber));
  });
});
