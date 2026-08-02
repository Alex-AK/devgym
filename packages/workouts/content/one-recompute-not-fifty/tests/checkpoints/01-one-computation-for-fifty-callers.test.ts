import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Cache } from '../../src/lib/cache';
import { Clock } from '../../src/lib/clock';
import { deferred, tick } from '../support/deferred';

const TTL = 30_000;

let clock: Clock;
let cache: Cache;

beforeEach(() => {
  clock = new Clock();
  cache = new Cache({ ttlMs: TTL }, clock);
});

describe('one computation for fifty callers', () => {
  it('computes once for a cold key and answers everybody with it', async () => {
    const slow = deferred<string>();
    const compute = vi.fn(() => slow.promise);

    const callers = Array.from({ length: 50 }, () => cache.get('report', compute));
    await tick();

    expect(compute, 'fifty callers, one cold key, one computation').toHaveBeenCalledTimes(1);

    slow.resolve('the report');
    expect(await Promise.all(callers)).toEqual(Array.from({ length: 50 }, () => 'the report'));
  });

  it('starts the computation rather than waiting to be asked twice', async () => {
    const compute = vi.fn(() => Promise.resolve('the report'));

    await expect(cache.get('report', compute)).resolves.toBe('the report');
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it('gives every key its own flight', async () => {
    const compute = vi.fn((key: string) => () => Promise.resolve(`value for ${key}`));

    const [a, b] = await Promise.all([
      cache.get('report-a', compute('report-a')),
      cache.get('report-b', compute('report-b')),
    ]);

    expect([a, b]).toEqual(['value for report-a', 'value for report-b']);
  });

  it('does not hold the key after the computation is done', async () => {
    const first = vi.fn(() => Promise.resolve('first'));
    await cache.get('report', first);

    // Past the TTL, so nothing is being served from memory here: the question is
    // only whether a finished flight was cleared away.
    await clock.advance(TTL + 1);

    const second = vi.fn(() => Promise.resolve('second'));
    await expect(cache.get('report', second)).resolves.toBe('second');
    expect(
      second,
      'the old flight was never removed, so the key is stuck on it'
    ).toHaveBeenCalled();
  });
});
