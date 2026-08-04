/**
 * The failures this workout deals in. `RequestAbortedError` and
 * `ConnectionLostError` are what `send` rejects with. `GaveUpError` is the one
 * you throw, and the checkpoints assert on its class and its fields, so throw
 * that rather than a plain error.
 */

/** The attempt was still in flight when its deadline passed. */
export class RequestAbortedError extends Error {
  constructor(readonly afterMs: number) {
    super(`attempt aborted after ${afterMs}ms`);
    this.name = 'RequestAbortedError';
  }
}

/** The connection died before an answer came back. */
export class ConnectionLostError extends Error {
  constructor() {
    super('connection lost');
    this.name = 'ConnectionLostError';
  }
}

export type GaveUpReason = 'not-safe-to-retry' | 'out-of-attempts' | 'out-of-budget';

/** The client stopped trying, and this is what it tells the caller. */
export class GaveUpError extends Error {
  constructor(
    readonly reason: GaveUpReason,
    readonly attempts: number,
    readonly lastStatus: number | null
  ) {
    super(
      `gave up after ${attempts} attempt${attempts === 1 ? '' : 's'}: ${reason}` +
        (lastStatus === null ? '' : ` (last status ${lastStatus})`)
    );
    this.name = 'GaveUpError';
  }
}
