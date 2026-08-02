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

/**
 * Right now this is a very expensive way to call a function: it forwards
 * everything, forever, however badly the dependency is doing.
 *
 * TODO: the three states, the counter that opens it, the wait that gives it a
 * second chance, and the timeout without which a hanging dependency never
 * trips the counter at all. See brief.md.
 */
export class CircuitBreaker {
  constructor(
    private readonly options: BreakerOptions,
    private readonly clock: Clock
  ) {
    void this.options;
    void this.clock;
    void CircuitOpenError;
    void CallTimeoutError;
  }

  /** Derived, not stored: the wait is over when the clock says it is. */
  get state(): BreakerState {
    return 'closed';
  }

  async call<T>(fn: () => Promise<T>): Promise<T> {
    return fn();
  }
}
