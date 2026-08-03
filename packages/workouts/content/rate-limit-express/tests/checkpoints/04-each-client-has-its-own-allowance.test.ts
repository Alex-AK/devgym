import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { FakeRedis } from '../../src/server/fake-redis';

const LIMIT = 5;

let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeEach(() => {
  server = createApp(new FakeRedis(), { limit: LIMIT, windowSeconds: 60 }).listen(0);
});

// One listener per test rather than one per request: supertest binds a fresh
// ephemeral port each time it is handed an app, and these suites issue a request
// per unit of allowance.
afterEach(() => {
  server.close();
});

const postAs = (apiKey: string) =>
  request(server).post('/messages').set('X-API-Key', apiKey).send({ text: 'hi' });

async function exhaust(apiKey: string) {
  for (let i = 0; i < LIMIT; i += 1) await postAs(apiKey);
}

describe('each client has its own allowance', () => {
  it('does not charge one client for another one', async () => {
    await exhaust('alpha');
    expect((await postAs('alpha')).status).toBe(429);

    expect((await postAs('beta')).status, 'beta paid for what alpha spent').toBe(201);
  });

  it('gives the second client the full allowance', async () => {
    await exhaust('alpha');
    const response = await postAs('beta');

    expect(response.headers['ratelimit-remaining']).toBe(String(LIMIT - 1));
  });

  it('keeps blocking the client that ran out', async () => {
    await exhaust('alpha');
    await postAs('beta');
    await postAs('beta');

    expect((await postAs('alpha')).status).toBe(429);
  });

  it('treats a request with no key as its own client rather than crashing', async () => {
    await exhaust('alpha');
    const anonymous = await request(server).post('/messages').send({ text: 'hi' });

    expect(anonymous.status).toBe(201);
  });

  it('lets both clients run out independently', async () => {
    await exhaust('alpha');
    await exhaust('beta');

    expect((await postAs('alpha')).status).toBe(429);
    expect((await postAs('beta')).status).toBe(429);
  });
});
