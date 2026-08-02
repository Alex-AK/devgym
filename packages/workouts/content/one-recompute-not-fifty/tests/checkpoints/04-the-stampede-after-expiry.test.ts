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

describe('the stampede after expiry', () => {
  it('lets exactly one of fifty callers recompute an expired key', async () => {
    await cache.get('report', () => Promise.resolve('first'));
    await clock.advance(TTL + 1);

    const slow = deferred<string>();
    const compute = vi.fn(() => slow.promise);

    const callers = Array.from({ length: 50 }, () => cache.get('report', compute));
    await tick();

    expect(compute, 'the expiry let all fifty through at once').toHaveBeenCalledTimes(1);

    slow.resolve('second');
    expect(await Promise.all(callers)).toEqual(Array.from({ length: 50 }, () => 'second'));
  });

  it('serves the new value from memory afterwards', async () => {
    await cache.get('report', () => Promise.resolve('first'));
    await clock.advance(TTL + 1);
    await cache.get('report', () => Promise.resolve('second'));

    const compute = vi.fn(() => Promise.resolve('third'));
    await expect(cache.get('report', compute)).resolves.toBe('second');
    expect(
      compute,
      'the recomputed value should have been stored like any other'
    ).not.toHaveBeenCalled();
  });

  it('expires each key on its own schedule', async () => {
    await cache.get('early', () => Promise.resolve('early value'));
    await clock.advance(Math.floor(TTL / 2));
    await cache.get('late', () => Promise.resolve('late value'));

    await clock.advance(Math.floor(TTL / 2) + 1);

    const early = vi.fn(() => Promise.resolve('recomputed'));
    const late = vi.fn(() => Promise.resolve('recomputed'));

    await expect(cache.get('early', early)).resolves.toBe('recomputed');
    await expect(cache.get('late', late)).resolves.toBe('late value');
    expect(late, 'the later key was still fresh').not.toHaveBeenCalled();
  });

  it('does not let a stampede on one key block another', async () => {
    const stuck = deferred<string>();
    const slow = cache.get('slow', () => stuck.promise);
    await tick();

    await expect(cache.get('fast', () => Promise.resolve('fast value'))).resolves.toBe(
      'fast value'
    );

    stuck.resolve('slow value');
    await expect(slow).resolves.toBe('slow value');
  });
});
