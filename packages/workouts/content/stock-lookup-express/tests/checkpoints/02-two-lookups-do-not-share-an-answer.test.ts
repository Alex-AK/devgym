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

describe('two lookups do not share an answer', () => {
  it('answers for the branch that was asked', async () => {
    const leeds = await lookup('leeds', 'DRILL-03');
    const hull = await lookup('hull', 'DRILL-03');

    expect(hull.body.branch, 'hull was answered with leeds').toBe('hull');
    expect(hull.body.units, 'hull was served the count from leeds').not.toBe(leeds.body.units);
  });

  it('answers for the item that was asked', async () => {
    const drill = await lookup('leeds', 'DRILL-03');
    const saw = await lookup('leeds', 'SAW-01');

    expect(saw.body.sku, 'the saw lookup was answered with the drill').toBe('SAW-01');
    expect(saw.body.units, 'the saw was served the count for the drill').not.toBe(drill.body.units);
  });

  it('gives each lookup its own entry', async () => {
    const pairs: [string, string][] = [
      ['leeds', 'DRILL-03'],
      ['hull', 'DRILL-03'],
      ['leeds', 'SAW-01'],
    ];

    const first = [];
    for (const [branch, sku] of pairs) first.push(await lookup(branch, sku));

    expect(stock.counts).toBe(3);
    expect(await redis.keys('*'), 'three lookups, three entries').toHaveLength(3);

    // Every one of them is a hit now, and each one still gets its own answer.
    for (const [index, [branch, sku]] of pairs.entries()) {
      expect((await lookup(branch, sku)).body).toEqual(first[index]?.body);
    }
    expect(stock.counts, 'one of the three lookups was added up again').toBe(3);
  });
});
