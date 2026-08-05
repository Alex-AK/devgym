import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { book, type BookingResult } from '../../src/server/bookings';
import { createCentre, type Centre } from '../../src/server/db';
import { runDuringNextCheck } from '../../src/server/members';

let centre: Centre;

beforeEach(() => {
  centre = createCentre();
});

afterEach(() => {
  centre.close();
});

const placesLeft = (classId: number) =>
  centre.desk
    .prepare('SELECT places_left FROM classes WHERE id = ?')
    .get<{ places_left: number }>(classId)?.places_left;

const bookedCount = (classId: number) =>
  centre.desk
    .prepare("SELECT count(*) AS c FROM bookings WHERE class_id = ? AND state = 'booked'")
    .get<{ c: number }>(classId)?.c;

interface Landed {
  web?: BookingResult;
  desk?: BookingResult;
  webError?: unknown;
  deskError?: unknown;
}

/**
 * Two people book Beginners ceramics, which has two places left. The desk's
 * booking runs start to finish inside the web's membership check, so the two
 * overlap the same way on every run rather than by luck: better-sqlite3 is
 * synchronous, and the checkpoint decides who goes when instead of the clock.
 */
function twoBookingsAtOnce(): Landed {
  const landed: Landed = {};

  runDuringNextCheck(() => {
    try {
      landed.desk = book(centre.desk, 1, 114);
    } catch (error) {
      landed.deskError = error;
    }
  });

  try {
    landed.web = book(centre.web, 1, 113);
  } catch (error) {
    landed.webError = error;
  }

  return landed;
}

describe('two bookings landing on one class at the same moment', () => {
  it('takes both of them, because the class had a place for both', () => {
    const { web, desk, webError, deskError } = twoBookingsAtOnce();

    expect(deskError).toBeUndefined();
    expect(webError).toBeUndefined();
    expect(desk).toMatchObject({ classId: 1, memberId: 114, memberName: 'Noor Rahimi' });
    expect(web).toMatchObject({ classId: 1, memberId: 113, memberName: 'Mira Kaplan' });
    expect(bookedCount(1)).toBe(12);
  });

  it('takes a place off the class for each of them', () => {
    twoBookingsAtOnce();

    expect(placesLeft(1), 'the class is still offering a place it has already given away').toBe(0);
  });

  it('tells each of them what the class had left after their booking', () => {
    const { web, desk } = twoBookingsAtOnce();

    expect(desk?.placesLeft).toBe(1);
    expect(web?.placesLeft).toBe(0);
  });

  it('leaves the class agreeing with its own bookings', () => {
    twoBookingsAtOnce();

    const row = centre.desk
      .prepare(
        `SELECT capacity, places_left,
                (SELECT count(*) FROM bookings WHERE class_id = 1 AND state = 'booked') AS booked
         FROM classes WHERE id = 1`
      )
      .get<{ capacity: number; places_left: number; booked: number }>();

    expect(row?.places_left, 'places left is not capacity minus the bookings').toBe(
      (row?.capacity ?? 0) - (row?.booked ?? 0)
    );
  });
});
