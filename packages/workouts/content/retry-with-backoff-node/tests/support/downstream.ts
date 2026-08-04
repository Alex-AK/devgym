import type { DownstreamResponse, Method, OutboundRequest, Send } from '../../src/lib/downstream';
import { ConnectionLostError } from '../../src/lib/errors';

/** What the downstream does with one request. */
export type Reply =
  | { kind: 'answers'; status: number; headers: Record<string, string> }
  | { kind: 'drops' }
  | { kind: 'hangs' };

export const answers = (status: number, headers: Record<string, string> = {}): Reply => ({
  kind: 'answers',
  status,
  headers,
});

export const drops = (): Reply => ({ kind: 'drops' });
export const hangs = (): Reply => ({ kind: 'hangs' });

/**
 * The provider, standing in for the one thing here that is not in this process.
 * It answers in the same tick or not at all: a scripted status comes back
 * immediately without moving the clock, a drop rejects immediately, and a hang
 * settles only when the signal it was handed aborts it. The last entry of the
 * script repeats for as long as requests keep arriving.
 */
export class FakeDownstream {
  /** Every request that reached it, in order. */
  readonly received: OutboundRequest[] = [];
  /** How many attempts were called off rather than walked away from. */
  aborted = 0;

  constructor(private readonly script: Reply[]) {}

  readonly send: Send = (request, signal) => {
    this.received.push(request);
    const reply =
      this.script[Math.min(this.received.length - 1, this.script.length - 1)] ?? answers(200);

    if (signal?.aborted) {
      // A signal that was spent before this attempt began.
      this.aborted += 1;
      return Promise.reject(signal.reason as Error);
    }

    if (reply.kind === 'answers') {
      return Promise.resolve({
        status: reply.status,
        headers: reply.headers,
        body: { path: request.path },
      });
    }

    if (reply.kind === 'drops') return Promise.reject(new ConnectionLostError());

    return new Promise<DownstreamResponse>((_resolve, reject) => {
      signal?.addEventListener(
        'abort',
        () => {
          this.aborted += 1;
          reject(signal.reason as Error);
        },
        { once: true }
      );
    });
  };
}

function outbound(method: Method, path: string, headers: Record<string, string> = {}) {
  return { method, path, headers };
}

export const get = (path: string): OutboundRequest => outbound('GET', path);
export const put = (path: string): OutboundRequest => outbound('PUT', path);
export const post = (path: string, headers: Record<string, string> = {}): OutboundRequest =>
  outbound('POST', path, headers);
