import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';

// One listener for the file. supertest binds a fresh ephemeral port every time
// it is handed an app, and building one inline made that a port per call.
// The app holds no per-test state, so one server serves the whole suite.
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeAll(() => {
  server = createApp().listen(0);
});

afterAll(() => {
  server.close();
});

function login(payload: unknown) {
  return request(server)
    .post('/login')
    .send(payload as object);
}

describe('bad credentials get 401 and no token', () => {
  it('turns down a wrong password', async () => {
    const response = await login({ email: 'ada@example.com', password: 'not-her-password' });

    expect(response.status).toBe(401);
    expect((response.body as { token?: unknown }).token).toBeUndefined();
  });

  it('turns down an address that has no account', async () => {
    const response = await login({ email: 'nobody@example.com', password: 'correct-horse' });

    expect(response.status).toBe(401);
    expect((response.body as { token?: unknown }).token).toBeUndefined();
  });

  it('answers the two the same way, so the endpoint does not list who has an account', async () => {
    const wrongPassword = await login({ email: 'ada@example.com', password: 'not-her-password' });
    const noSuchUser = await login({ email: 'nobody@example.com', password: 'not-her-password' });

    expect(noSuchUser.status).toBe(wrongPassword.status);
    expect(noSuchUser.body).toEqual(wrongPassword.body);
  });

  it('handles a request with fields missing instead of crashing', async () => {
    for (const payload of [{}, { email: 'ada@example.com' }, { password: 'correct-horse' }]) {
      const response = await login(payload);

      expect(response.status, `${JSON.stringify(payload)} was a ${response.status}`).toBeLessThan(
        500
      );
      expect((response.body as { token?: unknown }).token).toBeUndefined();
    }
  });

  it('never puts the stored hash in a response', async () => {
    const response = await login({ email: 'ada@example.com', password: 'not-her-password' });
    expect(JSON.stringify(response.body)).not.toContain('scrypt$');
  });
});
