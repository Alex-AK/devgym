import type { Clock } from './clock';

export interface Booking {
  id: string;
  /** When the car arrives, as an instant: ISO 8601 in UTC. */
  pickupAt: string;
  /** The IANA zone the rider reads their times in. */
  riderZone: string;
  /** What the clocks did to the time that was asked for. */
  status: 'exact' | 'shifted' | 'ambiguous';
}

const HOUR_MS = 60 * 60 * 1000;

/** `date` is YYYY-MM-DD and `time` is HH:mm, both on the dispatch clock. */
export function bookPickup(id: string, date: string, time: string, riderZone: string): Booking {
  const [year, month, day] = date.split('-').map(Number) as [number, number, number];
  const [hour, minute] = time.split(':').map(Number) as [number, number];

  // The dispatch clock is the process's clock, so the local constructor is the
  // conversion: it applies whichever offset was in force that morning. Date.UTC
  // would have applied none, and a string with no zone on it is not an instant.
  const at = new Date(year, month - 1, day, hour, minute, 0, 0);

  return { id, pickupAt: at.toISOString(), riderZone, status: statusOf(at, hour, minute) };
}

/**
 * Which of the three the requested time turned out to be. The clock answers
 * both questions itself, so neither needs a table of transition dates.
 */
function statusOf(at: Date, hour: number, minute: number): Booking['status'] {
  // Nothing on the dispatch clock read what was asked for, so it never happened
  // and this instant is the first one after the gap.
  if (at.getHours() !== hour || at.getMinutes() !== minute) return 'shifted';

  // An hour later reads the same time again, so the time comes round twice and
  // this is the first of the two. New York moves its clocks by an hour; a zone
  // that moves by thirty minutes wants that number here instead.
  const later = new Date(at.getTime() + HOUR_MS);
  if (later.getHours() === hour && later.getMinutes() === minute) return 'ambiguous';

  return 'exact';
}

/** The pickup as a rider in `zone` reads it off their phone. */
export function pickupTimeIn(booking: Booking, zone: string): { date: string; time: string } {
  // Intl is the only thing here that will answer for a zone the process is not
  // in, and formatToParts gives the fields already padded.
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: zone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(booking.pickupAt));

  const field = (type: string): string => parts.find((part) => part.type === type)?.value ?? '';
  return {
    date: `${field('year')}-${field('month')}-${field('day')}`,
    time: `${field('hour')}:${field('minute')}`,
  };
}

/** We text the rider a day before, at the time they are being picked up. */
export function reminderAt(booking: Booking): string {
  const at = new Date(booking.pickupAt);
  // A calendar day back rather than 24 hours. The two differ by an hour on the
  // two mornings the clocks move, and what the rider was promised is the time.
  at.setDate(at.getDate() - 1);
  return at.toISOString();
}

/** Ids of the bookings whose reminder is due and whose car has not come yet. */
export function dueReminders(bookings: Booking[], clock: Clock): string[] {
  const now = clock.now();
  return bookings
    .filter(
      (booking) => Date.parse(reminderAt(booking)) <= now && Date.parse(booking.pickupAt) > now
    )
    .map((booking) => booking.id);
}
