import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CircuitBreaker } from '../../src/lib/breaker';
import { Clock } from '../../src/lib/clock';
import { CircuitOpenError } from '../../src/lib/errors';
import { outcome, PENDING } from '../support/outcome';

const OPTIONS = { failureThreshold: 3, openMs: 5_000, timeoutMs: 100 };

let clock: Clock;
let breaker: CircuitBreaker;

const boom = () => Promise.reject(new Error('upstream is down'));

async function trip(): Promise<void> {
  for (let i = 0; i < OPTIONS.failureThreshold; i += 1) {
    await expect(breaker.call(boom)).rejects.toThrow('upstream is down');
  }
}

beforeEach(async () => {
  clock = new Clock();
  breaker = new CircuitBreaker(OPTIONS, clock);
  await trip();
});

describe('one trial call decides', () => {
  it('goes half-open once the wait is over', async () => {
    await clock.advance(OPTIONS.openMs);

    expect(breaker.state).toBe('half-open');
  });

  it('lets exactly one call through while half-open', async () => {
    await clock.advance(OPTIONS.openMs);

    let release: (value: string) => void = () => {};
    const dependency = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          release = resolve;
        })
    );

    const trial = breaker.call(dependency);
    const second = await outcome(breaker.call(dependency));

    expect(second, 'the second caller was left waiting on the trial instead of refused').not.toBe(
      PENDING
    );
    expect(second).toBeInstanceOf(CircuitOpenError);
    expect(
      dependency,
      'the second caller should not have reached the dependency'
    ).toHaveBeenCalledTimes(1);

    release('value');
    await expect(trial).resolves.toBe('value');
  });

  it('closes on a successful trial', async () => {
    await clock.advance(OPTIONS.openMs);

    await expect(breaker.call(() => Promise.resolve('value'))).resolves.toBe('value');

    expect(breaker.state).toBe('closed');
  });

  it('starts the count from scratch after it closes', async () => {
    await clock.advance(OPTIONS.openMs);
    await expect(breaker.call(() => Promise.resolve('value'))).resolves.toBe('value');

    await expect(breaker.call(boom)).rejects.toThrow('upstream is down');

    expect(breaker.state, 'one failure is not the threshold').toBe('closed');
  });

  it('re-opens on a failed trial, and waits again from there', async () => {
    await clock.advance(OPTIONS.openMs);
    await expect(breaker.call(boom)).rejects.toThrow('upstream is down');

    expect(breaker.state, 'one failure while half-open is enough').toBe('open');

    await clock.advance(OPTIONS.openMs - 1);
    expect(breaker.state, 'the wait restarts from the failed trial').toBe('open');

    await clock.advance(1);
    expect(breaker.state).toBe('half-open');
  });
});
