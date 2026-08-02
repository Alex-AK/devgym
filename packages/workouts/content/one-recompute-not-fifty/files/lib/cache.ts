import type { Clock } from './clock';

export interface CacheOptions {
  /** How long a computed value stays fresh. */
  ttlMs: number;
}

/**
 * Right now this is not a cache at all: every caller gets their own
 * computation, which is exactly the behaviour the report endpoint has today.
 *
 * TODO: serve a fresh value from memory, and make concurrent callers for a cold
 * key wait on one computation rather than starting fifty. See brief.md.
 */
export class Cache {
  constructor(
    private readonly options: CacheOptions,
    private readonly clock: Clock
  ) {
    void this.options;
    void this.clock;
  }

  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    void key;
    return compute();
  }
}
