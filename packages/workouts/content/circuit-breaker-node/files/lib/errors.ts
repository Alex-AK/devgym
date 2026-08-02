/**
 * The two failures the breaker produces itself, rather than passing on from the
 * call it made. Given to you: the checkpoints assert on these classes, so throw
 * these rather than plain errors.
 */

/** The breaker refused the call instead of making it. */
export class CircuitOpenError extends Error {
  constructor() {
    super('circuit is open');
    this.name = 'CircuitOpenError';
  }
}

/** The call was still unsettled when its time ran out. */
export class CallTimeoutError extends Error {
  constructor(ms: number) {
    super(`call timed out after ${ms}ms`);
    this.name = 'CallTimeoutError';
  }
}
