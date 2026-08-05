import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { FakeRedis } from '../../src/server/fake-redis';
import { Stock } from '../../src/server/stock';

const TTL_SECONDS = 30;

let stock: Stock;
let redis: FakeRedis;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the test rather than one per request. supertest binds a fresh
// ephemeral port every time it is handed an app, so a suite that loops requests
// leaves a socket per assertion in TIME_WAIT and fails as `socket hang up` under
// the parallel load of `pnpm verify`, on a different checkpoint each run.
beforeEach(() => {
  stock = new Stock();
  redis = new FakeRedis();
  server = createApp(stock, redis, { ttlSeconds: TTL_SECONDS }).listen(0);
});

afterEach(() => {
  server.close();
});

const lookup = (branch: string, sku: string) =>
  request(server).get('/availability').query({ branch, sku });

describe('an entry nobody cleared still expires', () => {
  it('puts a deadline on what it stores', async () => {
    await lookup('leeds', 'DRILL-03');

    const [key = ''] = await redis.keys('*');
    expect(key, 'nothing was stored in redis').not.toBe('');
    // -1 is a key with no deadline at all, which outlives everything that could
    // clear it.
    expect(await redis.ttl(key), 'the entry has no deadline on it').toBeGreaterThan(0);
  });

  it('serves the stored answer up to the deadline', async () => {
    const first = await lookup('leeds', 'DRILL-03');

    // The till, which never touches this endpoint, so nothing here clears
    // anything. Standing on a stored answer for the rest of its life is the
    // right behaviour, not a bug.
    stock.recordDelivery('leeds', 'DRILL-03', 12);
    redis.advanceTime(TTL_SECONDS - 1);

    expect((await lookup('leeds', 'DRILL-03')).body).toEqual(first.body);
    expect(stock.counts, 'the deadline expired early').toBe(1);
  });

  it('counts again once the deadline has passed', async () => {
    const first = await lookup('leeds', 'DRILL-03');
    stock.recordDelivery('leeds', 'DRILL-03', 12);

    redis.advanceTime(TTL_SECONDS + 1);

    const after = await lookup('leeds', 'DRILL-03');
    expect(after.body.units, 'the stored answer outlived its deadline').toBe(first.body.units + 12);
    expect(stock.counts).toBe(2);
  });
});
