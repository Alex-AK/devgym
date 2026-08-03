import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { FakeRedis } from '../../src/server/fake-redis';

const LIMIT = 5;
const WINDOW = 60;

let app: ReturnType<typeof createApp>;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeEach(() => {
  app = createApp(new FakeRedis(), { limit: LIMIT, windowSeconds: WINDOW });
  server = app.listen(0);
});

// One listener per test rather than one per request: supertest binds a fresh
// ephemeral port each time it is handed an app, and these suites issue a request
// per unit of allowance.
afterEach(() => {
  server.close();
});

const post = () => request(server).post('/messages').set('X-API-Key', 'alpha').send({ text: 'hi' });

async function useUpTheAllowance() {
  for (let i = 0; i < LIMIT; i += 1) await post();
}

describe('past the limit the client is turned away', () => {
  it('answers the next request with 429', async () => {
    await useUpTheAllowance();
    expect((await post()).status).toBe(429);
  });

  it('does not run the handler behind it', async () => {
    await useUpTheAllowance();
    const before = app.locals.handled as number;
    const response = await post();

    expect(response.body).not.toEqual({ sent: true });
    // Answering and then calling next() as well looks fine from out here:
    // express drops the second response. The handler still ran.
    expect(app.locals.handled, 'the blocked request reached the handler anyway').toBe(before);
  });

  it('tells the client how long to wait', async () => {
    await useUpTheAllowance();
    const retryAfter = Number((await post()).headers['retry-after']);

    expect(Number.isInteger(retryAfter), 'Retry-After has to be whole seconds').toBe(true);
    expect(
      retryAfter,
      'telling a client to retry immediately is telling it to hammer you'
    ).toBeGreaterThan(0);
    expect(retryAfter).toBeLessThanOrEqual(WINDOW);
  });

  it('reports nothing remaining rather than a negative number', async () => {
    await useUpTheAllowance();
    const response = await post();

    expect(response.headers['ratelimit-remaining']).toBe('0');
  });

  it('keeps turning them away, rather than letting the next one through', async () => {
    await useUpTheAllowance();
    const statuses = [(await post()).status, (await post()).status, (await post()).status];

    expect(statuses).toEqual([429, 429, 429]);
  });
});
