import { beforeEach, describe, expect, it } from 'vitest';

import { CircuitBreaker } from '../../src/lib/breaker';
import { Clock } from '../../src/lib/clock';

const OPTIONS = { failureThreshold: 3, openMs: 5_000, timeoutMs: 100 };

let clock: Clock;
let breaker: CircuitBreaker;

beforeEach(() => {
  clock = new Clock();
  breaker = new CircuitBreaker(OPTIONS, clock);
});

const ok = () => Promise.resolve('value');
const boom = () => Promise.reject(new Error('upstream is down'));

async function fail(times: number): Promise<void> {
  for (let i = 0; i < times; i += 1) {
    await expect(breaker.call(boom)).rejects.toThrow('upstream is down');
  }
}

describe('failures trip it', () => {
  it('starts closed and passes the value through', async () => {
    expect(breaker.state).toBe('closed');
    await expect(breaker.call(ok)).resolves.toBe('value');
  });

  it('passes the failure through rather than swallowing it', async () => {
    await expect(breaker.call(boom)).rejects.toThrow('upstream is down');
  });

  it('stays closed below the threshold', async () => {
    await fail(OPTIONS.failureThreshold - 1);
    expect(breaker.state).toBe('closed');
  });

  it('opens on the failure that reaches the threshold', async () => {
    await fail(OPTIONS.failureThreshold);
    expect(breaker.state).toBe('open');
  });

  it('counts consecutive failures, so a success clears the tally', async () => {
    await fail(2);
    await expect(breaker.call(ok)).resolves.toBe('value');
    await fail(2);

    expect(breaker.state, 'two, then a success, then two more is not three in a row').toBe(
      'closed'
    );
  });
});
