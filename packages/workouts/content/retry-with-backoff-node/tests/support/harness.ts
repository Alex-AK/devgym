import { Clock } from '../../src/lib/clock';
import { RetryingClient } from '../../src/lib/retry';
import { FakeDownstream, type Reply } from './downstream';

/** What the checkpoints configure a client with unless they say otherwise. */
export const OPTIONS = {
  maxAttempts: 3,
  baseMs: 100,
  capMs: 2_000,
  timeoutMs: 250,
  budgetMs: 60_000,
};

/**
 * One client, one clock, one scripted downstream. `random` defaults to zero, so
 * the backoff costs nothing anywhere it is not the thing being checked.
 */
export function harness(
  script: Reply[],
  overrides: Partial<typeof OPTIONS> = {},
  random: () => number = () => 0
): { clock: Clock; downstream: FakeDownstream; client: RetryingClient } {
  const clock = new Clock();
  const downstream = new FakeDownstream(script);
  const client = new RetryingClient(
    { ...OPTIONS, ...overrides },
    { send: downstream.send, clock, random }
  );
  return { clock, downstream, client };
}
