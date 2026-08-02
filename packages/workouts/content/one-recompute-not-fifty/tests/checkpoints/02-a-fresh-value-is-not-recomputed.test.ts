import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cache } from '../../src/lib/cache';
import { Clock } from '../../src/lib/clock';

const TTL = 30_000;

let clock: Clock;
let cache: Cache;

beforeEach(() => {
  clock = new Clock();
  cache = new Cache({ ttlMs: TTL }, clock);
});

describe('a fresh value is not recomputed', () => {
  it('serves the second caller from memory', async () => {
    const compute = vi.fn(() => Promise.resolve('the report'));

    await cache.get('report', compute);
    await expect(cache.get('report', compute)).resolves.toBe('the report');

    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('keeps serving it right up to the deadline', async () => {
    const compute = vi.fn(() => Promise.resolve('the report'));
    await cache.get('report', compute);

    await clock.advance(TTL - 1);

    await expect(cache.get('report', compute)).resolves.toBe('the report');
    expect(compute, 'the value had a millisecond of freshness left').toHaveBeenCalledTimes(1);
  });

  it('stops serving it once the deadline has passed', async () => {
    const first = vi.fn(() => Promise.resolve('stale'));
    await cache.get('report', first);

    await clock.advance(TTL);

    const second = vi.fn(() => Promise.resolve('fresh'));
    await expect(cache.get('report', second)).resolves.toBe('fresh');
  });

  it('dates the value from when the computation finished', async () => {
    const compute = vi.fn(() => Promise.resolve('the report'));
    await cache.get('report', compute);

    // Two thirds of a lifetime, twice. If the TTL is measured from the moment
    // of the last read rather than from the write, this never expires.
    await clock.advance(Math.floor(TTL * 0.7));
    await cache.get('report', compute);
    await clock.advance(Math.floor(TTL * 0.7));

    const second = vi.fn(() => Promise.resolve('fresh'));
    await expect(cache.get('report', second)).resolves.toBe('fresh');
    expect(second, 'reading a value must not extend its life').toHaveBeenCalled();
  });
});
