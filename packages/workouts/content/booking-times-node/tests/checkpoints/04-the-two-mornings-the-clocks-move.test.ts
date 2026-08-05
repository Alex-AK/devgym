import { describe, expect, it } from 'vitest';

import { bookPickup } from '../../src/lib/booking';

const RIDER_ZONE = 'America/New_York';

/**
 * 8 March and 1 November 2026, the two mornings New York moves its clocks at
 * 02:00. Every other morning of the year, 02:30 is 02:30.
 */
describe('the two mornings the clocks move', () => {
  it('moves a pickup the clocks skipped to the first time that happened', () => {
    const pickup = bookPickup('gap', '2026-03-08', '02:30', RIDER_ZONE);
    expect(pickup.status).toBe('shifted');
    expect(pickup.pickupAt).toBe('2026-03-08T07:30:00.000Z');
  });

  it('takes the first of a time that comes round twice', () => {
    const pickup = bookPickup('fold', '2026-11-01', '01:30', RIDER_ZONE);
    expect(pickup.status).toBe('ambiguous');
    expect(pickup.pickupAt).toBe('2026-11-01T05:30:00.000Z');
  });

  it('leaves the same times on an ordinary morning alone', () => {
    const spring = bookPickup('a', '2026-03-15', '02:30', RIDER_ZONE);
    expect(spring.status).toBe('exact');
    expect(spring.pickupAt).toBe('2026-03-15T06:30:00.000Z');

    const autumn = bookPickup('b', '2026-11-08', '01:30', RIDER_ZONE);
    expect(autumn.status).toBe('exact');
    expect(autumn.pickupAt).toBe('2026-11-08T06:30:00.000Z');
  });

  it('leaves two hours of driving between two pickups an hour apart', () => {
    const first = bookPickup('first', '2026-11-01', '01:30', RIDER_ZONE);
    const second = bookPickup('second', '2026-11-01', '02:30', RIDER_ZONE);

    expect(second.status).toBe('exact');
    expect(
      Date.parse(second.pickupAt) - Date.parse(first.pickupAt),
      'an hour on the clock, two hours of real time'
    ).toBe(2 * 60 * 60 * 1000);
  });

  it('leaves one hour of driving between two pickups two hours apart', () => {
    const early = bookPickup('early', '2026-03-08', '01:30', RIDER_ZONE);
    const late = bookPickup('late', '2026-03-08', '03:30', RIDER_ZONE);

    expect(
      Date.parse(late.pickupAt) - Date.parse(early.pickupAt),
      'two hours on the clock, one hour of real time'
    ).toBe(60 * 60 * 1000);
  });
});
