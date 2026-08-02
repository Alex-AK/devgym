interface Timer {
  dueAt: number;
  resolve: () => void;
}

/**
 * A clock the checkpoints drive. Nothing here waits in real time: `sleep`
 * resolves only when `advance` moves the clock past its deadline, so a cache
 * entry that lives for a minute costs a test nothing to expire.
 *
 * Given to you, and not part of the exercise. Use `now()` and `sleep()`; the
 * checkpoints use `advance()`.
 */
export class Clock {
  private nowMs = 0;
  private timers: Timer[] = [];

  now(): number {
    return this.nowMs;
  }

  /** Resolves once the clock has moved `ms` forward, and never on its own. */
  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.timers.push({ dueAt: this.nowMs + ms, resolve });
    });
  }

  /** Test-only. Moves the clock, firing every timer that comes due on the way. */
  async advance(ms: number): Promise<void> {
    const target = this.nowMs + ms;

    for (;;) {
      const next = this.timers
        .filter((timer) => timer.dueAt <= target)
        .sort((a, b) => a.dueAt - b.dueAt)[0];
      if (!next) break;

      this.nowMs = next.dueAt;
      this.timers = this.timers.filter((timer) => timer !== next);
      next.resolve();
      await settle();
    }

    this.nowMs = target;
    await settle();
  }
}

/** Let everything waiting on a resolved promise actually run before we return. */
function settle(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}
