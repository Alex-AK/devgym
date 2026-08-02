import { beforeEach, describe, expect, it } from 'vitest';

import { CircuitBreaker } from '../../src/lib/breaker';
import { Clock } from '../../src/lib/clock';
import { CallTimeoutError } from '../../src/lib/errors';
import { outcome, PENDING } from '../support/outcome';

const OPTIONS = { failureThreshold: 3, openMs: 5_000, timeoutMs: 100 };

let clock: Clock;
let breaker: CircuitBreaker;

beforeEach(() => {
  clock = new Clock();
  breaker = new CircuitBreaker(OPTIONS, clock);
});

/** A dependency that has not failed. It simply never answers. */
const hangs = () => new Promise<string>(() => {});

/** Runs one call out of time, and returns what the breaker did about it. */
async function runOutOfTime(): Promise<unknown> {
  const call = breaker.call(hangs);
  await clock.advance(OPTIONS.timeoutMs);
  return outcome(call);
}

describe('a slow call is a failure', () => {
  it('gives up on a call that has run out of time', async () => {
    const result = await runOutOfTime();

    expect(result, 'the call was still waiting on a dependency that never answers').not.toBe(
      PENDING
    );
    expect(result).toBeInstanceOf(CallTimeoutError);
  });

  it('waits for the whole timeout before giving up', async () => {
    const call = breaker.call(hangs);

    await clock.advance(OPTIONS.timeoutMs - 1);
    expect(await outcome(call), 'the call still had a millisecond left').toBe(PENDING);

    await clock.advance(1);
    expect(await outcome(call)).toBeInstanceOf(CallTimeoutError);
  });

  it('counts a timeout towards the threshold, so a hanging dependency trips it', async () => {
    for (let i = 0; i < OPTIONS.failureThreshold; i += 1) {
      expect(await runOutOfTime(), 'every attempt has to end for the count to move').not.toBe(
        PENDING
      );
    }

    expect(breaker.state, 'nothing ever rejected, so only the timeout can have counted').toBe(
      'open'
    );
  });

  it('leaves a call that answers in time alone', async () => {
    await expect(breaker.call(() => Promise.resolve('value'))).resolves.toBe('value');

    await clock.advance(OPTIONS.timeoutMs * 10);

    expect(breaker.state, 'the call had already answered').toBe('closed');
  });
});
