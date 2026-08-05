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

const deliver = (branch: string, sku: string, units: number) =>
  request(server).post('/deliveries').send({ branch, sku, units });

describe('a delivery clears what it changed', () => {
  it('lets the next lookup see the delivery', async () => {
    const before = await lookup('leeds', 'DRILL-03');

    const recorded = await deliver('leeds', 'DRILL-03', 12);
    expect(recorded.status).toBe(201);

    const after = await lookup('leeds', 'DRILL-03');
    expect(after.body.units, 'the lookup is still answering with the old count').toBe(
      before.body.units + 12
    );
  });

  it('leaves the lookups it did not change where they were', async () => {
    await lookup('leeds', 'DRILL-03');
    const hull = await lookup('hull', 'DRILL-03');
    const saw = await lookup('leeds', 'SAW-01');
    expect(stock.counts).toBe(3);

    await deliver('leeds', 'DRILL-03', 12);
    await lookup('leeds', 'DRILL-03');

    expect((await lookup('hull', 'DRILL-03')).body).toEqual(hull.body);
    expect((await lookup('leeds', 'SAW-01')).body).toEqual(saw.body);
    expect(stock.counts, 'a delivery to one branch threw away answers it had not changed').toBe(4);
  });

  it('leaves nothing stored for the one it did change', async () => {
    await lookup('leeds', 'DRILL-03');
    await lookup('hull', 'DRILL-03');

    await deliver('leeds', 'DRILL-03', 12);

    expect(await redis.keys('*'), 'one entry was cleared, not the other').toHaveLength(1);
  });

  it('does not have to be preceded by a lookup', async () => {
    const recorded = await deliver('exeter', 'TORCH-02', 5);
    expect(recorded.status).toBe(201);

    const after = await lookup('exeter', 'TORCH-02');
    expect(after.body.units).toBe(new Stock().countUnits('exeter', 'TORCH-02') + 5);
  });
});
