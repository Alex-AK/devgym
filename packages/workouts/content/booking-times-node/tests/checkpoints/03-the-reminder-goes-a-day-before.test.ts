import { describe, expect, it } from 'vitest';

import { dueReminders, reminderAt } from '../../src/lib/booking';
import { fixedClock } from '../../src/lib/clock';
import { booking } from '../support/booking';

/** Every pickup here is 9:00 am on the dispatch clock. So is every reminder. */
describe('the reminder goes a day before, on the clock', () => {
  it('goes a day before an ordinary pickup', () => {
    expect(reminderAt(booking('2026-01-15T14:00:00.000Z'))).toBe('2026-01-14T14:00:00.000Z');
  });

  it('holds the time on the clock over the morning the clocks go forward', () => {
    // Pickup on Sunday 8 March. The Saturday before it is 25 hours away.
    expect(reminderAt(booking('2026-03-08T13:00:00.000Z'))).toBe('2026-03-07T14:00:00.000Z');
  });

  it('holds the time on the clock over the morning the clocks go back', () => {
    // Pickup on Sunday 1 November. The Saturday before it is 23 hours away.
    expect(reminderAt(booking('2026-11-01T14:00:00.000Z'))).toBe('2026-10-31T13:00:00.000Z');
  });

  it('texts the riders who are due a reminder and nobody else', () => {
    // Half past eight on the Saturday morning, on the dispatch clock.
    const clock = fixedClock('2026-03-07T13:30:00.000Z');
    const bookings = [
      booking('2026-03-08T13:00:00.000Z', 'sunday-morning'),
      booking('2026-03-08T01:00:00.000Z', 'tonight'),
      booking('2026-03-09T13:00:00.000Z', 'monday-morning'),
    ];

    expect(
      dueReminders(bookings, clock),
      'the Sunday rider is texted at 9:00 on Saturday, and it is not 9:00 yet'
    ).toEqual(['tonight']);
  });
});
