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

interface PlacesRow {
  places_left: number;
}

/**
 * Take a place in a class for a member. Called from the public booking page and
 * from the front desk terminal, which are two processes with a connection each.
 *
 * Both channels write `classes.places_left`, so a number read out of that row
 * describes the class at the moment of the read and nothing after it. The
 * booking therefore never writes a count it worked out itself: it asks the
 * database to move the count relative to whatever the row holds when the write
 * lands, and takes the answer to "was there a place" from whether that moved
 * anything.
 */
export function book(db: Db, classId: number, memberId: number): BookingResult {
  const classRow = db
    .prepare('SELECT id, title, places_left FROM classes WHERE id = ?')
    .get<ClassRow>(classId);
  if (!classRow) throw new NotFound(`no class ${classId}`);

  const membership = checkMembership(memberId);
  if (!membership.current) throw new NotAMember(`member ${memberId} is not a current member`);

  // Worth doing for the common case and for the message, but it is not the
  // decision: the membership check is slow, and the class can fill during it.
  if (classRow.places_left <= 0) throw new ClassFull(`${classRow.title} is full`);

  const take = db.transaction((): { bookingId: number; placesLeft: number } => {
    // The condition is in the statement, so the database evaluates it against
    // the row it is about to write rather than against a copy from before the
    // membership check. Nought rows changed means somebody else took the place.
    const taken = db
      .prepare('UPDATE classes SET places_left = places_left - 1 WHERE id = ? AND places_left > 0')
      .run(classId);
    if (taken.changes === 0) throw new ClassFull(`${classRow.title} is full`);

    const inserted = db
      .prepare(
        "INSERT INTO bookings (class_id, member_id, state, booked_at) VALUES (?, ?, 'booked', ?)"
      )
      .run(classId, memberId, new Date().toISOString());

    const after = db
      .prepare('SELECT places_left FROM classes WHERE id = ?')
      .get<PlacesRow>(classId);
    if (!after) throw new NotFound(`no class ${classId}`);

    return { bookingId: Number(inserted.lastInsertRowid), placesLeft: after.places_left };
  });

  // Immediate, because this transaction exists to write: BEGIN IMMEDIATE takes
  // the write lock at the BEGIN instead of at the first statement that needs it.
  // The first statement here is already a write, so the two behave the same
  // today. They stop behaving the same the moment a SELECT goes in above it,
  // because a deferred transaction that reads first cannot then write on top of
  // anything committed since its snapshot: that is SQLITE_BUSY_SNAPSHOT.
  const { bookingId, placesLeft } = take.immediate();

  return { bookingId, classId, memberId, memberName: membership.name, placesLeft };
}

/** Give a booked place back. The desk does this over the phone. */
export function cancel(db: Db, bookingId: number): CancelResult {
  const booking = db
    .prepare('SELECT id, class_id, state FROM bookings WHERE id = ?')
    .get<BookingRow>(bookingId);
  if (!booking) throw new NotFound(`no booking ${bookingId}`);
  if (booking.state !== 'booked') throw new NotBooked(`booking ${bookingId} is already cancelled`);

  const give = db.transaction((): number => {
    // The state goes in the WHERE for the reason the count does in `book`: two
    // cancellations of one booking would otherwise both give a place back, and
    // the class would end up offering a place that does not exist.
    const cancelled = db
      .prepare("UPDATE bookings SET state = 'cancelled' WHERE id = ? AND state = 'booked'")
      .run(bookingId);
    if (cancelled.changes === 0) throw new NotBooked(`booking ${bookingId} is already cancelled`);

    db.prepare('UPDATE classes SET places_left = places_left + 1 WHERE id = ?').run(
      booking.class_id
    );

    const after = db
      .prepare('SELECT places_left FROM classes WHERE id = ?')
      .get<PlacesRow>(booking.class_id);
    if (!after) throw new NotFound(`no class ${booking.class_id}`);

    return after.places_left;
  });

  return { bookingId, classId: booking.class_id, placesLeft: give.immediate() };
}
