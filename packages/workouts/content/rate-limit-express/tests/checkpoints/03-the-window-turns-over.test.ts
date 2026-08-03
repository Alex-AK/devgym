import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { FakeRedis } from '../../src/server/fake-redis';

const LIMIT = 5;
const WINDOW = 60;

let redis: FakeRedis;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeEach(() => {
  redis = new FakeRedis();
  server = createApp(redis, { limit: LIMIT, windowSeconds: WINDOW }).listen(0);
});

// One listener per test rather than one per request: supertest binds a fresh
// ephemeral port each time it is handed an app, and these suites issue a request
// per unit of allowance.
afterEach(() => {
  server.close();
});

const post = () => request(server).post('/messages').set('X-API-Key', 'alpha').send({ text: 'hi' });

async function spend(times: number) {
  for (let i = 0; i < times; i += 1) await post();
}

describe('the window turns over', () => {
  it('gives the allowance back once the window has passed', async () => {
    await spend(LIMIT);
    expect((await post()).status, 'the client should be blocked by now').toBe(429);

    redis.advanceTime(WINDOW + 1);

    expect((await post()).status, 'the counter never expired, so the block is forever').toBe(201);
  });

  it('starts a fresh allowance rather than one request of headroom', async () => {
    await spend(LIMIT);
    redis.advanceTime(WINDOW + 1);

    for (let i = 1; i <= LIMIT; i += 1) {
      expect((await post()).status, `request ${i} of the new window was turned away`).toBe(201);
    }
  });

  it('does not push the window back every time the client calls', async () => {
    // Three now, two later, then wait out the window that the first request
    // opened. Refreshing the deadline on every request moves the end of the
    // window to 40 + 60, and this client is still locked out at second 65.
    await spend(3);
    redis.advanceTime(40);
    await spend(2);

    expect((await post()).status, 'the allowance should be spent').toBe(429);

    redis.advanceTime(25);

    expect(
      (await post()).status,
      'the window opened at second 0, so it was over at second 60'
    ).toBe(201);
  });

  it('counts down towards the turnover rather than sitting still', async () => {
    const first = Number((await post()).headers['ratelimit-reset']);
    redis.advanceTime(30);
    const later = Number((await post()).headers['ratelimit-reset']);

    expect(later).toBeLessThan(first);
  });
});
