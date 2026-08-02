import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitBreaker } from '../../src/lib/breaker';
import { Clock } from '../../src/lib/clock';
import { CircuitOpenError } from '../../src/lib/errors';

const OPTIONS = { failureThreshold: 3, openMs: 5_000, timeoutMs: 100 };

let clock: Clock;
let breaker: CircuitBreaker;

beforeEach(async () => {
  clock = new Clock();
  breaker = new CircuitBreaker(OPTIONS, clock);

  for (let i = 0; i < OPTIONS.failureThreshold; i += 1) {
    await expect(breaker.call(() => Promise.reject(new Error('upstream is down')))).rejects.toThrow(
      'upstream is down'
    );
  }
});

describe('an open circuit fails fast', () => {
  it('refuses with a CircuitOpenError', async () => {
    await expect(breaker.call(() => Promise.resolve('value'))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
  });

  it('does not call the dependency at all', async () => {
    const dependency = vi.fn(() => Promise.resolve('value'));

    await expect(breaker.call(dependency)).rejects.toBeInstanceOf(CircuitOpenError);

    expect(
      dependency,
      'the point of an open circuit is not making the call'
    ).not.toHaveBeenCalled();
  });

  it('stays open while the wait is still running', async () => {
    await clock.advance(OPTIONS.openMs - 1);

    expect(breaker.state).toBe('open');
    await expect(breaker.call(() => Promise.resolve('value'))).rejects.toBeInstanceOf(
      CircuitOpenError
    );
  });

  it('does not let a refusal count as another failure', async () => {
    for (let i = 0; i < 5; i += 1) {
      await expect(breaker.call(() => Promise.resolve('value'))).rejects.toBeInstanceOf(
        CircuitOpenError
      );
    }

    await clock.advance(OPTIONS.openMs);

    expect(breaker.state, 'refusals must not push the wait back').toBe('half-open');
  });
});
