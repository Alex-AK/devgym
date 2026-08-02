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

describe('a failure is not a value', () => {
  it('rejects every caller waiting on the failed computation', async () => {
    const slow = deferred<string>();
    const compute = vi.fn(() => slow.promise);

    const callers = Array.from({ length: 5 }, () => cache.get('report', compute));
    await tick();
    slow.reject(new Error('the database is down'));

    for (const caller of callers) {
      await expect(caller).rejects.toThrow('the database is down');
    }
  });

  it('does not cache the failure', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('the database is down')));
    await expect(cache.get('report', failing)).rejects.toThrow('the database is down');

    const working = vi.fn(() => Promise.resolve('the report'));
    await expect(cache.get('report', working)).resolves.toBe('the report');
  });

  it('lets the next caller try again rather than joining a dead flight', async () => {
    const failing = vi.fn(() => Promise.reject(new Error('the database is down')));

    await expect(cache.get('report', failing)).rejects.toThrow('the database is down');
    await expect(cache.get('report', failing)).rejects.toThrow('the database is down');

    expect(failing, 'the failed flight was never cleared away').toHaveBeenCalledTimes(2);
  });

  it('keeps a value it already had when a later computation fails', async () => {
    await cache.get('report', () => Promise.resolve('the report'));

    const failing = vi.fn(() => Promise.reject(new Error('the database is down')));
    await expect(cache.get('other', failing)).rejects.toThrow('the database is down');

    const untouched = vi.fn(() => Promise.resolve('recomputed'));
    await expect(cache.get('report', untouched)).resolves.toBe('the report');
    expect(untouched, 'one key failing must not evict another').not.toHaveBeenCalled();
  });
});
