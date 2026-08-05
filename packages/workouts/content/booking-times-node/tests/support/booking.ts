import type { Booking } from '../../src/lib/booking';

/**
 * A booking already in the database, built by hand so that a checkpoint about
 * reading one back does not depend on the checkpoint about writing one.
 */
export function booking(pickupAt: string, id = 'ride', riderZone = 'America/New_York'): Booking {
  return { id, pickupAt, riderZone, status: 'exact' };
}
