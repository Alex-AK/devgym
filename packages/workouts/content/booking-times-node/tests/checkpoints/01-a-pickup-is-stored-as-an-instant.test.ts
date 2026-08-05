import { describe, expect, it } from 'vitest';

import { bookPickup } from '../../src/lib/booking';

/**
 * Every time here is a 9:00 am pickup on the dispatch clock, and the stored
 * instant is a different number of hours behind it in January than in July.
 */
describe('a pickup is stored as an instant', () => {
  it('stores the instant a winter morning pickup happens', () => {
    const booking = bookPickup('a', '2026-01-15', '09:00', 'America/Los_Angeles');
    expect(booking.pickupAt).toBe('2026-01-15T14:00:00.000Z');
  });

  it('stores the instant a summer morning pickup happens', () => {
    const booking = bookPickup('b', '2026-07-15', '09:00', 'Europe/Dublin');
    expect(booking.pickupAt).toBe('2026-07-15T13:00:00.000Z');
  });

  it('stores something that means the same to whoever reads it', () => {
    const booking = bookPickup('c', '2026-03-09', '06:15', 'Asia/Tokyo');
    expect(
      new Date(booking.pickupAt).toISOString(),
      'a stored time with no zone on it is whatever the reader thinks it is'
    ).toBe(booking.pickupAt);
    expect(booking.pickupAt).toBe('2026-03-09T10:15:00.000Z');
  });

  it('keeps the rider zone and calls an ordinary morning exact', () => {
    const booking = bookPickup('d', '2026-01-15', '09:00', 'Asia/Tokyo');
    expect(booking.id).toBe('d');
    expect(booking.riderZone).toBe('Asia/Tokyo');
    expect(booking.status).toBe('exact');
  });
});
