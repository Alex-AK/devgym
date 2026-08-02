import type { Clock } from './clock';
import { CallTimeoutError, CircuitOpenError } from './errors';

export type BreakerState = 'closed' | 'open' | 'half-open';

export interface BreakerOptions {
  /** Consecutive failures that open the circuit. */
  failureThreshold: number;
  /** How long it stays open before it will try one call. */
  openMs: number;
  /** How long a single call may run before it counts as a failure. */
  timeoutMs: number;
}

export class CircuitBreaker {
  /** Only meaningful while closed: consecutive failures since the last success. */
  private failures = 0;
  /** When the circuit last opened, or null while it is closed. */
  private openedAtMs: number | null = null;
  /** Half-open lets exactly one call through, and this is how it knows. */
  private trialInFlight = false;

  constructor(
    private readonly options: BreakerOptions,
    private readonly clock: Clock
  ) {}

  get state(): BreakerState {
    if (this.openedAtMs === null) return 'closed';
    return this.clock.now() - this.openedAtMs >= this.options.openMs ? 'half-open' : 'open';
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    const state = this.state;
    if (state === 'open') throw new CircuitOpenError();

    const trial = state === 'half-open';
    if (trial) {
      if (this.trialInFlight) throw new CircuitOpenError();
      this.trialInFlight = true;
    }

    try {
      const value = await this.invoke(fn);
      this.onSuccess();
      return value;
    } catch (error) {
      this.onFailure();
      throw error;
    } finally {
      if (trial) this.trialInFlight = false;
    }
  }

  /**
   * The race decides which of the two finished first, and the loser resolves to
   * a sentinel rather than rejecting: a rejection nobody is waiting on any more
   * is an unhandled rejection later, when the clock moves past it.
   */
  private async invoke<T>(fn: () => Promise<T>): Promise<T> {
    const timedOut = Symbol('timed-out');
    const result = await Promise.race([
      fn(),
      this.clock.sleep(this.options.timeoutMs).then(() => timedOut),
    ]);

    if (result === timedOut) throw new CallTimeoutError(this.options.timeoutMs);
    return result as T;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.openedAtMs = null;
  }

  private onFailure(): void {
    // A failed trial re-opens the circuit and restarts the wait from now.
    if (this.openedAtMs !== null) {
      this.openedAtMs = this.clock.now();
      return;
    }

    this.failures += 1;
    if (this.failures >= this.options.failureThreshold) {
      this.openedAtMs = this.clock.now();
      this.failures = 0;
    }
  }
}
