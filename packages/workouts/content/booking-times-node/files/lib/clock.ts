/**
 * A clock stopped at one instant. Nothing here waits in real time and nothing
 * advances on its own: the checkpoints decide what `now()` reads, so a reminder
 * that is due next Tuesday costs a test nothing to check.
 *
 * Given to you, and not part of the exercise. Use `now()`; the checkpoints build
 * the clock.
 */
export interface Clock {
  /** Milliseconds since the epoch, the same value every call. */
  now(): number;
}

export function fixedClock(instant: string): Clock {
  const at = Date.parse(instant);
  if (Number.isNaN(at)) throw new Error(`fixedClock: "${instant}" is not a date`);
  return { now: () => at };
}
