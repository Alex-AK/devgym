import type { Clock } from './clock';

export interface Booking {
  id: string;
  /** When the car arrives. */
  pickupAt: string;
  /** The IANA zone the rider reads their times in. */
  riderZone: string;
  /** What the clocks did to the time that was asked for. */
  status: 'exact' | 'shifted' | 'ambiguous';
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `date` is YYYY-MM-DD and `time` is HH:mm, both on the dispatch clock. */
export function bookPickup(id: string, date: string, time: string, riderZone: string): Booking {
  return {
    id,
    pickupAt: `${date}T${time}:00`,
    riderZone,
    status: 'exact',
  };
}

/** The pickup as a rider in `zone` reads it off their phone. */
export function pickupTimeIn(booking: Booking, zone: string): { date: string; time: string } {
  const at = new Date(booking.pickupAt);
  return {
    date: `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}`,
    time: `${pad(at.getHours())}:${pad(at.getMinutes())}`,
  };
}

/** We text the rider a day before, at the time they are being picked up. */
export function reminderAt(booking: Booking): string {
  return new Date(Date.parse(booking.pickupAt) - DAY_MS).toISOString();
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

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
