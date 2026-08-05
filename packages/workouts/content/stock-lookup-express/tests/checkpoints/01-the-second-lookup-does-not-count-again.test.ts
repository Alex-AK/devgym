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

describe('the second lookup does not count again', () => {
  it('answers the first lookup with the count', async () => {
    const response = await lookup('leeds', 'DRILL-03');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      branch: 'leeds',
      sku: 'DRILL-03',
      units: expect.any(Number),
    });
    expect(stock.counts).toBe(1);
  });

  it('answers the second one without counting anything', async () => {
    const first = await lookup('leeds', 'DRILL-03');
    const second = await lookup('leeds', 'DRILL-03');

    expect(second.status).toBe(200);
    expect(second.body).toEqual(first.body);
    expect(stock.counts, 'the same lookup was added up twice').toBe(1);
  });

  it('keeps the answer in redis rather than in this process', async () => {
    await lookup('leeds', 'DRILL-03');

    // A Map in module scope would pass the test above and be a different cache
    // on every instance of this service.
    expect(await redis.keys('*'), 'nothing was stored in redis').toHaveLength(1);
  });

  it('still refuses a lookup that names no branch', async () => {
    const response = await request(server).get('/availability').query({ sku: 'DRILL-03' });

    expect(response.status).toBe(400);
    expect(stock.counts).toBe(0);
  });
});
