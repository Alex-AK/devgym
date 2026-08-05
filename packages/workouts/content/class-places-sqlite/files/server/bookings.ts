import type { Db } from './db';
import { checkMembership } from './members';

export interface BookingResult {
  bookingId: number;
  classId: number;
  memberId: number;
  memberName: string;
  /** What the class has left once this booking is taken. */
  placesLeft: number;
}

export interface CancelResult {
  bookingId: number;
  classId: number;
  placesLeft: number;
}

/** No class, or no booking, with that id. */
export class NotFound extends Error {}

/** The membership has lapsed, so there is nothing to book against. */
export class NotAMember extends Error {}

/** Every place in the class is taken. */
export class ClassFull extends Error {}

/** The booking is already cancelled, so there is no place to give back. */
export class NotBooked extends Error {}

interface ClassRow {
  id: number;
  title: string;
  places_left: number;
}

interface BookingRow {
  id: number;
  class_id: number;
  state: string;
}

/**
 * Take a place in a class for a member. Called from the public booking page and
 * from the front desk terminal, which are two processes with a connection each.
 */
export function book(db: Db, classId: number, memberId: number): BookingResult {
  const classRow = db
    .prepare('SELECT id, title, places_left FROM classes WHERE id = ?')
    .get<ClassRow>(classId);
  if (!classRow) throw new NotFound(`no class ${classId}`);

  const membership = checkMembership(memberId);
  if (!membership.current) throw new NotAMember(`member ${memberId} is not a current member`);

  if (classRow.places_left <= 0) throw new ClassFull(`${classRow.title} is full`);
  const placesLeft = classRow.places_left - 1;

  const take = db.transaction((): number => {
    const inserted = db
      .prepare(
        "INSERT INTO bookings (class_id, member_id, state, booked_at) VALUES (?, ?, 'booked', ?)"
      )
      .run(classId, memberId, new Date().toISOString());
    db.prepare('UPDATE classes SET places_left = ? WHERE id = ?').run(placesLeft, classId);
    return Number(inserted.lastInsertRowid);
  });

  return {
    bookingId: take(),
    classId,
    memberId,
    memberName: membership.name,
    placesLeft,
  };
}

/** Give a booked place back. The desk does this over the phone. */
export function cancel(db: Db, bookingId: number): CancelResult {
  const booking = db
    .prepare('SELECT id, class_id, state FROM bookings WHERE id = ?')
    .get<BookingRow>(bookingId);
  if (!booking) throw new NotFound(`no booking ${bookingId}`);
  if (booking.state !== 'booked') throw new NotBooked(`booking ${bookingId} is already cancelled`);

  const classRow = db
    .prepare('SELECT id, title, places_left FROM classes WHERE id = ?')
    .get<ClassRow>(booking.class_id);
  if (!classRow) throw new NotFound(`no class ${booking.class_id}`);

  const placesLeft = classRow.places_left + 1;

  const give = db.transaction((): void => {
    db.prepare("UPDATE bookings SET state = 'cancelled' WHERE id = ?").run(bookingId);
    db.prepare('UPDATE classes SET places_left = ? WHERE id = ?').run(placesLeft, booking.class_id);
  });
  give();

  return { bookingId, classId: booking.class_id, placesLeft };
}
