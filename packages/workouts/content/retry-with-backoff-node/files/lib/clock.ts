import { RequestAbortedError } from './errors';

interface Timer {
  dueAt: number;
  fire: () => void;
}

/**
 * A clock the checkpoints drive. Nothing here waits in real time: `sleep`
 * resolves, and `deadline` aborts, only once a checkpoint has moved the clock
 * past them, so a thirty-second backoff costs the suite nothing to check.
 *
 * Given to you, and not part of the exercise. Use `now()`, `sleep()` and
 * `deadline()`; `sleeps`, `deadlines` and `drain()` belong to the checkpoints.
 */
export class Clock {
  /** Test-only. Every duration asked of `sleep`, oldest first. */
  readonly sleeps: number[] = [];
  /** Test-only. Every duration asked of `deadline`, oldest first. */
  readonly deadlines: number[] = [];

  private nowMs = 0;
  private timers: Timer[] = [];

  now(): number {
    return this.nowMs;
  }

  /** Resolves once the clock has moved `ms` forward, and never on its own. */
  sleep(ms: number): Promise<void> {
    this.sleeps.push(ms);
    return new Promise((resolve) => {
      this.timers.push({ dueAt: this.nowMs + ms, fire: resolve });
    });
  }

  /** A deadline for one attempt: the signal aborts once `ms` has passed. */
  deadline(ms: number): AbortSignal {
    this.deadlines.push(ms);
    const controller = new AbortController();
    this.timers.push({
      dueAt: this.nowMs + ms,
      fire: () => controller.abort(new RequestAbortedError(ms)),
    });
    return controller.signal;
  }

  /**
   * Test-only. Jumps to each pending timer in turn, earliest first, until none
   * is left, so a checkpoint never has to know how long the code decided to
   * wait. Everything sitting on a resolved promise runs between two timers.
   */
  async drain(): Promise<void> {
    for (let fired = 0; fired < 200; fired += 1) {
      await settle();
      const next = [...this.timers].sort((a, b) => a.dueAt - b.dueAt)[0];
      if (!next) return;

      this.nowMs = Math.max(this.nowMs, next.dueAt);
      this.timers = this.timers.filter((timer) => timer !== next);
      next.fire();
    }
  }
}

/** Let everything waiting on a resolved promise actually run before we go on. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
