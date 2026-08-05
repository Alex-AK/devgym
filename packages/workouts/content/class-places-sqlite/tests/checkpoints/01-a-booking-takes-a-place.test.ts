import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  book,
  cancel,
  ClassFull,
  NotAMember,
  NotBooked,
  NotFound,
} from '../../src/server/bookings';
import { createCentre, type Centre } from '../../src/server/db';

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

const bookingRow = (id: number) =>
  centre.desk
    .prepare('SELECT class_id, member_id, state FROM bookings WHERE id = ?')
    .get<{ class_id: number; member_id: number; state: string }>(id);

describe('a booking and a cancellation, with nothing else going on', () => {
  it('takes a place and records who took it', () => {
    const result = book(centre.web, 1, 113);

    expect(result).toEqual({
      bookingId: expect.any(Number),
      classId: 1,
      memberId: 113,
      memberName: 'Mira Kaplan',
      placesLeft: 1,
    });
    expect(bookingRow(result.bookingId)).toEqual({
      class_id: 1,
      member_id: 113,
      state: 'booked',
    });
    expect(placesLeft(1)).toBe(1);
    expect(bookedCount(1)).toBe(11);
  });

  it('gives the place back when the booking is cancelled', () => {
    const { bookingId } = book(centre.web, 1, 113);

    expect(cancel(centre.web, bookingId)).toEqual({ bookingId, classId: 1, placesLeft: 2 });
    expect(bookingRow(bookingId)?.state).toBe('cancelled');
    expect(placesLeft(1)).toBe(2);
    expect(bookedCount(1)).toBe(10);
  });

  it('gives back one place when the same booking is cancelled twice', () => {
    const { bookingId } = book(centre.web, 1, 113);
    cancel(centre.web, bookingId);

    expect(() => cancel(centre.web, bookingId)).toThrow(NotBooked);
    expect(placesLeft(1), 'the second cancellation handed back a place as well').toBe(2);
  });

  it('refuses a class with no places left, and writes nothing', () => {
    expect(() => book(centre.web, 3, 113)).toThrow(ClassFull);

    expect(placesLeft(3)).toBe(0);
    expect(bookedCount(3)).toBe(6);
  });

  it('refuses a membership that has lapsed, and writes nothing', () => {
    expect(() => book(centre.web, 1, 190)).toThrow(NotAMember);

    expect(placesLeft(1)).toBe(2);
    expect(bookedCount(1)).toBe(10);
  });

  it('refuses a class id and a booking id that are no such thing', () => {
    expect(() => book(centre.web, 99, 113)).toThrow(NotFound);
    expect(() => cancel(centre.web, 999)).toThrow(NotFound);
  });

  it('leaves no transaction open behind a booking that was refused', () => {
    expect(() => book(centre.web, 3, 113)).toThrow(ClassFull);

    expect(centre.web.inTransaction, 'the refused booking left a transaction open').toBe(false);

    // Which the next booking on that connection would have found out about.
    expect(book(centre.web, 1, 113).placesLeft).toBe(1);
  });
});
