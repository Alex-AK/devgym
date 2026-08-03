import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { FakeRedis } from '../../src/server/fake-redis';

const LIMIT = 5;
const WINDOW = 60;

let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeEach(() => {
  server = createApp(new FakeRedis(), { limit: LIMIT, windowSeconds: WINDOW }).listen(0);
});

// One listener per test rather than one per request: supertest binds a fresh
// ephemeral port each time it is handed an app, and these suites issue a request
// per unit of allowance.
afterEach(() => {
  server.close();
});

const post = () => request(server).post('/messages').set('X-API-Key', 'alpha').send({ text: 'hi' });

describe('a client gets through until it hits the limit', () => {
  it('lets the whole allowance through', async () => {
    for (let i = 1; i <= LIMIT; i += 1) {
      const response = await post();
      expect(response.status, `request ${i} of ${LIMIT} was turned away`).toBe(201);
    }
  });

  it('says what the limit is on every response', async () => {
    const response = await post();
    expect(response.headers['ratelimit-limit']).toBe(String(LIMIT));
  });

  it('counts down what is left', async () => {
    const remaining: string[] = [];
    for (let i = 0; i < LIMIT; i += 1) {
      remaining.push((await post()).headers['ratelimit-remaining']);
    }

    expect(remaining).toEqual(['4', '3', '2', '1', '0']);
  });

  it('says when the window turns over', async () => {
    const response = await post();
    const reset = Number(response.headers['ratelimit-reset']);

    expect(Number.isInteger(reset)).toBe(true);
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(WINDOW);
  });

  it('still runs the handler it is guarding', async () => {
    const response = await post();
    expect(response.body).toEqual({ sent: true });
  });
});
