import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { book, type BookingResult, ClassFull } from '../../src/server/bookings';
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

const bookingsFor = (memberId: number, classId: number) =>
  centre.desk
    .prepare('SELECT id, state FROM bookings WHERE member_id = ? AND class_id = ?')
    .all<{ id: number; state: string }>(memberId, classId);

interface Landed {
  web?: BookingResult;
  desk?: BookingResult;
  webError?: unknown;
  deskError?: unknown;
}

/**
 * Life drawing has one place left and two people want it. The desk's booking
 * runs start to finish inside the web's membership check, so the desk always
 * gets there first and the web always arrives to a class that has just filled.
 */
function bothWantTheLastPlace(): Landed {
  const landed: Landed = {};

  runDuringNextCheck(() => {
    try {
      landed.desk = book(centre.desk, 2, 114);
    } catch (error) {
      landed.deskError = error;
    }
  });

  try {
    landed.web = book(centre.web, 2, 113);
  } catch (error) {
    landed.webError = error;
  }

  return landed;
}

describe('the last place in a class, wanted twice at the same moment', () => {
  it('goes to the one who got there first', () => {
    const { desk, deskError } = bothWantTheLastPlace();

    expect(deskError).toBeUndefined();
    expect(desk).toMatchObject({ classId: 2, memberId: 114, placesLeft: 0 });
    expect(bookingsFor(114, 2)).toEqual([{ id: expect.any(Number), state: 'booked' }]);
  });

  it('leaves the other one told the class is full', () => {
    const { web, webError } = bothWantTheLastPlace();

    expect(web, 'both callers were told they had a place').toBeUndefined();
    expect(webError).toBeInstanceOf(ClassFull);
  });

  it('writes nothing at all for the one who missed it', () => {
    bothWantTheLastPlace();

    expect(bookingsFor(113, 2), 'a booking survived for the caller who was refused').toEqual([]);
    expect(bookedCount(2), 'the class has more bookings than it has places').toBe(8);
  });

  it('leaves the class showing the nothing it has left', () => {
    bothWantTheLastPlace();

    expect(placesLeft(2)).toBe(0);
  });

  it('leaves nothing open on either connection', () => {
    bothWantTheLastPlace();

    expect(centre.web.inTransaction).toBe(false);
    expect(centre.desk.inTransaction).toBe(false);
  });
});
