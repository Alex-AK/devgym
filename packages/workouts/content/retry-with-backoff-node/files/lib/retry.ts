import type { Clock } from './clock';
import type { DownstreamResponse, OutboundRequest, Send } from './downstream';
import { GaveUpError } from './errors';

export interface RetryOptions {
  /** Attempts for one request, the first one included. */
  maxAttempts: number;
  /** The first backoff window. Each window after it doubles. */
  baseMs: number;
  /** The largest window the doubling is allowed to reach. */
  capMs: number;
  /** How long a single attempt may run before its deadline aborts it. */
  timeoutMs: number;
  /** How long the whole operation may run, measured from the call. */
  budgetMs: number;
}

export interface RetryDeps {
  send: Send;
  clock: Clock;
  /** Jitter, in [0, 1). Injected so the checkpoints can pin it. */
  random: () => number;
}

/**
 * Right now this is a plain pass-through: one attempt, no deadline on it, and
 * whatever came back is what the caller gets.
 *
 * TODO: the attempt worth making again, the wait before making it, the deadline
 * each one gets, and the two ways this is allowed to give up. See brief.md.
 */
export class RetryingClient {
  constructor(
    private readonly options: RetryOptions,
    private readonly deps: RetryDeps
  ) {
    void this.options;
    void GaveUpError;
  }

  async request(request: OutboundRequest): Promise<DownstreamResponse> {
    return this.deps.send(request);
  }
}
