import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { book, type BookingResult, cancel, type CancelResult } from '../../src/server/bookings';
import { createCentre, type Centre } from '../../src/server/db';
import { runDuringNextCheck } from '../../src/server/members';

let centre: Centre;

beforeEach(() => {
  centre = createCentre();
});

afterEach(() => {
  centre.close();
});

const bookingRow = (id: number) =>
  centre.desk
    .prepare('SELECT class_id, member_id, state FROM bookings WHERE id = ?')
    .get<{ class_id: number; member_id: number; state: string }>(id);

const classRow = (classId: number) =>
  centre.desk
    .prepare(
      `SELECT capacity, places_left,
              (SELECT count(*) FROM bookings WHERE class_id = c.id AND state = 'booked') AS booked
       FROM classes c WHERE c.id = ?`
    )
    .get<{ capacity: number; places_left: number; booked: number }>(classId);

interface Landed {
  booked?: BookingResult;
  cancelled?: CancelResult;
  bookError?: unknown;
  cancelError?: unknown;
}

/**
 * Ada rings the desk to give up her place in Beginners ceramics at the moment
 * Mira is booking one on the web. The cancellation runs start to finish inside
 * the booking's membership check, so the two overlap identically on every run.
 */
function aCancellationDuringABooking(): Landed {
  const landed: Landed = {};

  runDuringNextCheck(() => {
    try {
      landed.cancelled = cancel(centre.desk, 1);
    } catch (error) {
      landed.cancelError = error;
    }
  });

  try {
    landed.booked = book(centre.web, 1, 113);
  } catch (error) {
    landed.bookError = error;
  }

  return landed;
}

describe('a cancellation taken while a booking is in flight', () => {
  it('lets both of them through', () => {
    const { booked, cancelled, bookError, cancelError } = aCancellationDuringABooking();

    expect(cancelError).toBeUndefined();
    expect(bookError).toBeUndefined();
    expect(cancelled).toMatchObject({ bookingId: 1, classId: 1 });
    expect(booked).toMatchObject({ classId: 1, memberId: 113 });
  });

  it('writes both of them', () => {
    const { booked } = aCancellationDuringABooking();

    expect(bookingRow(1)?.state).toBe('cancelled');
    expect(bookingRow(booked?.bookingId ?? 0)).toEqual({
      class_id: 1,
      member_id: 113,
      state: 'booked',
    });
  });

  it('leaves the place the cancellation gave back where the booking can find it', () => {
    aCancellationDuringABooking();

    // Ten booked before, one gone, one taken: still ten of twelve.
    expect(classRow(1)?.booked).toBe(10);
    expect(classRow(1)?.places_left, 'a place went missing between the two of them').toBe(2);
  });

  it('tells the booking what the class had left afterwards', () => {
    const { booked } = aCancellationDuringABooking();

    expect(booked?.placesLeft).toBe(2);
  });

  it('leaves places left equal to capacity minus the bookings, on every class', () => {
    aCancellationDuringABooking();

    for (const classId of [1, 2, 3]) {
      const row = classRow(classId);
      expect(row?.places_left, `class ${classId} does not add up`).toBe(
        (row?.capacity ?? 0) - (row?.booked ?? 0)
      );
    }
  });
});
