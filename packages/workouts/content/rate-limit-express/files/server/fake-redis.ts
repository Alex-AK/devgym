interface Entry {
  value: string;
  /** Null means the key has no deadline and lives until it is deleted. */
  expiresAtMs: number | null;
}

/**
 * Enough of Redis to write real Redis code against, and no more. The commands
 * behave the way the real ones do, including the parts that catch people out:
 * `incr` on a missing key starts at 1 and leaves it with no expiry, `expire`
 * returns 0 when there is no key to put a deadline on, and `ttl` distinguishes
 * "no deadline" (-1) from "no key" (-2).
 */
export class FakeRedis {
  private readonly store = new Map<string, Entry>();
  private offsetMs = 0;

  private now(): number {
    return Date.now() + this.offsetMs;
  }

  /** The entry, unless its deadline has passed, in which case it is gone. */
  private live(key: string): Entry | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;

    if (entry.expiresAtMs !== null && entry.expiresAtMs <= this.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  incr(key: string): Promise<number> {
    const entry = this.live(key);
    const next = entry ? Number(entry.value) + 1 : 1;
    // A key created by incr has no deadline until something gives it one.
    this.store.set(key, { value: String(next), expiresAtMs: entry?.expiresAtMs ?? null });
    return Promise.resolve(next);
  }

  /** 1 if the deadline was set, 0 if there was no key to set it on. */
  expire(key: string, seconds: number): Promise<number> {
    const entry = this.live(key);
    if (!entry) return Promise.resolve(0);

    entry.expiresAtMs = this.now() + seconds * 1000;
    return Promise.resolve(1);
  }

  /** Seconds left, -1 if the key has no deadline, -2 if there is no key. */
  ttl(key: string): Promise<number> {
    const entry = this.live(key);
    if (!entry) return Promise.resolve(-2);
    if (entry.expiresAtMs === null) return Promise.resolve(-1);

    return Promise.resolve(Math.ceil((entry.expiresAtMs - this.now()) / 1000));
  }

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.live(key)?.value ?? null);
  }

  set(key: string, value: string): Promise<'OK'> {
    this.store.set(key, { value, expiresAtMs: null });
    return Promise.resolve('OK');
  }

  del(key: string): Promise<number> {
    return Promise.resolve(this.store.delete(key) ? 1 : 0);
  }

  /**
   * Test-only. Real Redis has no such command: the checkpoints use this instead
   * of sleeping, so a window that lasts a minute costs nothing to check.
   */
  advanceTime(seconds: number): void {
    this.offsetMs += seconds * 1000;
  }
}
