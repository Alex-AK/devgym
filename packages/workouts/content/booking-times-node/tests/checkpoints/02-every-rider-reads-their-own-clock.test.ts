import { describe, expect, it } from 'vitest';

import { pickupTimeIn } from '../../src/lib/booking';
import { booking } from '../support/booking';

/** 9:00 am on the dispatch clock, on an ordinary January morning. */
const januaryMorning = booking('2026-01-15T14:00:00.000Z');

describe('every rider reads their own clock', () => {
  it('gives a rider the time their own phone shows', () => {
    expect(pickupTimeIn(januaryMorning, 'America/Los_Angeles')).toEqual({
      date: '2026-01-15',
      time: '06:00',
    });
    expect(pickupTimeIn(januaryMorning, 'Asia/Tokyo')).toEqual({
      date: '2026-01-15',
      time: '23:00',
    });
  });

  it('gives dispatch the same instant on the dispatch clock', () => {
    expect(pickupTimeIn(januaryMorning, 'America/New_York')).toEqual({
      date: '2026-01-15',
      time: '09:00',
    });
  });

  it('follows both zones when only one of them has changed its clocks', () => {
    // Both of these are a 9:00 am pickup in New York, three weeks apart. New
    // York changed its clocks on 8 March and Dublin does not until 29 March, so
    // for those three weeks the two are an hour closer together than usual.
    expect(pickupTimeIn(booking('2026-03-01T14:00:00.000Z'), 'Europe/Dublin')).toEqual({
      date: '2026-03-01',
      time: '14:00',
    });
    expect(pickupTimeIn(booking('2026-03-09T13:00:00.000Z'), 'Europe/Dublin')).toEqual({
      date: '2026-03-09',
      time: '13:00',
    });
  });

  it('gives a rider the date their own clock is on, not the date dispatch is on', () => {
    expect(pickupTimeIn(booking('2026-11-01T05:30:00.000Z'), 'America/Los_Angeles')).toEqual({
      date: '2026-10-31',
      time: '22:30',
    });
  });
});
