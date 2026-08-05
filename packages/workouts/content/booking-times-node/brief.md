# The car came at the wrong hour

Three complaints in a week, all of them about the clock. A rider in Los Angeles read 9:00 am off her
confirmation and stood outside at 9:00; the car had been and gone at 6:00. Every reminder for Sunday
8 March went out an hour early. And the 2:30 am pickup that morning sits in the system as 3:30,
which nobody set and nobody mentioned to the rider.

## The task

One file: **`src/lib/booking.ts`**. Four functions, and what each one owes.

**`bookPickup`** takes the date and the time a rider asked for, both on the dispatch clock, and
returns the booking. `pickupAt` is the instant the car arrives, ISO 8601 in UTC, the string
`toISOString()` gives.

**`pickupTimeIn`** answers what a rider in a given zone reads off their phone: `{ date, time }`, as
`YYYY-MM-DD` and 24-hour `HH:mm`, both zero-padded.

**`reminderAt`** is the instant we text them, which is a day before the pickup at the same time on
the dispatch clock.

**`dueReminders`** is the ids of the bookings whose reminder is due and whose car has not come yet,
in the order they were given.

**Twice a year the time a rider asks for is not an ordinary time**, and `status` says which of the
three it turned out to be:

- `shifted` — the clocks went forward and that time never happened. Take the first time that did.
- `ambiguous` — the clocks went back and that time happened twice. Take the first of the two.
- `exact` — every other time on every other day.

## What you are given

**The dispatch zone is the process's zone.** Every pickup is in New York, the box runs there, and
`TZ` is pinned to `America/New_York` in production and for these checkpoints. A rider's zone is data
on the booking, because riders are not in New York.

**`America/New_York` moves its clocks at 02:00 local.** In 2026 that is forward on 8 March and back
on 1 November.

**`src/lib/clock.ts`** is a clock stopped at one instant. `now()` reads milliseconds since the epoch
and never moves on its own; the checkpoints decide what it says. Nothing here waits in real time.

## Notes

Nothing is imported from outside these two files, and nothing needs to be. `npm`-style commands are
not available: hit **Run checkpoints** to see where you are.

## If you finish early

- The dispatch zone is the environment, which holds while there is one city. Work out what has to
  become data the day a second one opens, and what does not.
- A rider asks for 01:30 on 1 November and means the second one. Decide what the booking form would
  have to ask, and what you would store.
- New York moves its clocks by an hour. Lord Howe Island moves its by thirty minutes. Find the line
  that assumes the hour, and decide whether you care.
