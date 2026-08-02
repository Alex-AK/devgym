import type { Clock } from './clock';

export interface CacheOptions {
  /** How long a computed value stays fresh. */
  ttlMs: number;
}

interface Entry {
  value: unknown;
  freshUntilMs: number;
}

export class Cache {
  private readonly entries = new Map<string, Entry>();
  /**
   * The whole of single-flight: one promise per key, shared by everyone who
   * arrives while it is running, and removed the moment it settles.
   */
  private readonly inFlight = new Map<string, Promise<unknown>>();

  constructor(
    private readonly options: CacheOptions,
    private readonly clock: Clock
  ) {}

  async get<T>(key: string, compute: () => Promise<T>): Promise<T> {
    const entry = this.entries.get(key);
    if (entry && entry.freshUntilMs > this.clock.now()) return entry.value as T;

    const existing = this.inFlight.get(key);
    if (existing) return existing as Promise<T>;

    const flight = compute()
      .then((value) => {
        // Only a success is stored. A failure has to be retried, not served.
        this.entries.set(key, {
          value,
          freshUntilMs: this.clock.now() + this.options.ttlMs,
        });
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, flight);
    return flight;
  }
}
