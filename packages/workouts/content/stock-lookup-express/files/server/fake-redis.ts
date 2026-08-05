interface Entry {
  value: string;
  /** Null means the key has no deadline and lives until something deletes it. */
  expiresAtMs: number | null;
}

/**
 * Enough of Redis to write real Redis code against, and no more. The commands
 * behave the way the real ones do, including the parts that catch people out:
 * `set` with no TTL stores the value forever and clears any deadline the key
 * already had, `del` answers with how many keys it actually removed, and `ttl`
 * distinguishes "no deadline" (-1) from "no key" (-2).
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

  get(key: string): Promise<string | null> {
    return Promise.resolve(this.live(key)?.value ?? null);
  }

  /**
   * Store a value, with a deadline if you give it one.
   *
   * Leaving `ttlSeconds` out is real `SET`: the value lives until it is deleted,
   * and any deadline the key was already carrying goes with it.
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<'OK'> {
    const expiresAtMs = ttlSeconds === undefined ? null : this.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAtMs });
    return Promise.resolve('OK');
  }

  /** How many of those keys were there to remove. */
  del(...keys: string[]): Promise<number> {
    let removed = 0;
    for (const key of keys) {
      if (this.live(key) && this.store.delete(key)) removed += 1;
    }
    return Promise.resolve(removed);
  }

  /** Seconds left, -1 if the key has no deadline, -2 if there is no key. */
  ttl(key: string): Promise<number> {
    const entry = this.live(key);
    if (!entry) return Promise.resolve(-2);
    if (entry.expiresAtMs === null) return Promise.resolve(-1);

    return Promise.resolve(Math.ceil((entry.expiresAtMs - this.now()) / 1000));
  }

  /**
   * Every live key matching the pattern, where `*` stands for any run of
   * characters. Real `KEYS` walks the whole keyspace and blocks the server while
   * it does, which is why production Redis reaches for `SCAN` instead.
   */
  keys(pattern = '*'): Promise<string[]> {
    const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, (char) =>
      char === '*' ? '[\\s\\S]*' : `\\${char}`
    );
    const matches = new RegExp(`^${escaped}$`);

    return Promise.resolve(
      [...this.store.keys()].filter((key) => this.live(key) !== undefined && matches.test(key))
    );
  }

  /** Everything, gone. */
  flushAll(): Promise<'OK'> {
    this.store.clear();
    return Promise.resolve('OK');
  }

  /**
   * Test-only. Real Redis has no such command: the checkpoints use this instead
   * of sleeping, so an entry that lives for a minute costs nothing to expire.
   */
  advanceTime(seconds: number): void {
    this.offsetMs += seconds * 1000;
  }
}
