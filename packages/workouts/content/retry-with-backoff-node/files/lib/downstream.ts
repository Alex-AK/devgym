/**
 * The shape of the one call that leaves this process. The client is handed a
 * `Send` in its dependencies; the checkpoints decide what is behind it.
 *
 * Given to you, and not part of the exercise.
 */

export type Method = 'DELETE' | 'GET' | 'POST' | 'PUT';

export interface OutboundRequest {
  method: Method;
  path: string;
  /** Lowercased keys. `idempotency-key` is the one that matters here. */
  headers: Record<string, string>;
}

export interface DownstreamResponse {
  status: number;
  /** Lowercased keys, so `Retry-After` arrives as `retry-after`. */
  headers: Record<string, string>;
  body: unknown;
}

/**
 * One attempt. It resolves with whatever the downstream answered, whatever the
 * status, and rejects when no answer came back at all: `RequestAbortedError`
 * once the signal fires, `ConnectionLostError` when the connection dies.
 */
export type Send = (request: OutboundRequest, signal?: AbortSignal) => Promise<DownstreamResponse>;
