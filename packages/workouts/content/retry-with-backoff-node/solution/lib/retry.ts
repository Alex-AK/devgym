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

/** The four that mean the request did not get a healthy answer out of anyone. */
const RETRYABLE = new Set([429, 502, 503, 504]);

/** Sending one of these again is the same as sending it once. */
const IDEMPOTENT = new Set(['DELETE', 'GET', 'PUT']);

export class RetryingClient {
  constructor(
    private readonly options: RetryOptions,
    private readonly deps: RetryDeps
  ) {}

  async request(request: OutboundRequest): Promise<DownstreamResponse> {
    const { clock, send } = this.deps;
    const expiresAt = clock.now() + this.options.budgetMs;

    let attempts = 0;
    let lastStatus: number | null = null;

    for (;;) {
      attempts += 1;
      let retryAfterMs: number | null = null;

      try {
        // The deadline belongs to this attempt, so it is armed inside the loop.
        const response = await send(request, clock.deadline(this.options.timeoutMs));
        lastStatus = response.status;
        if (!RETRYABLE.has(response.status)) return response;
        retryAfterMs = readRetryAfter(response);
      } catch {
        // No answer, so nothing here says whether the downstream ran it. The
        // two rejections differ in cause and not in what we may do about it.
        lastStatus = null;
        if (!safeToSendAgain(request)) {
          throw new GaveUpError('not-safe-to-retry', attempts, null);
        }
      }

      if (attempts >= this.options.maxAttempts) {
        throw new GaveUpError('out-of-attempts', attempts, lastStatus);
      }

      await clock.sleep(retryAfterMs ?? this.backoff(attempts - 1));

      // Asked after the wait, which is what lets a long Retry-After end it.
      if (clock.now() + this.options.timeoutMs > expiresAt) {
        throw new GaveUpError('out-of-budget', attempts, lastStatus);
      }
    }
  }

  /** Full jitter: somewhere in the window rather than the whole of it. */
  private backoff(waits: number): number {
    return this.deps.random() * Math.min(this.options.capMs, this.options.baseMs * 2 ** waits);
  }
}

function safeToSendAgain(request: OutboundRequest): boolean {
  return IDEMPOTENT.has(request.method) || 'idempotency-key' in request.headers;
}

function readRetryAfter(response: DownstreamResponse): number | null {
  const header = response.headers['retry-after'];
  return header === undefined ? null : Number(header) * 1000;
}
