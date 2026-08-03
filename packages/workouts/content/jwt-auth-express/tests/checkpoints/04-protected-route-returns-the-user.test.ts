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

const ADA = { email: 'ada@example.com', password: 'correct-horse' };
const BRUNO = { email: 'bruno@example.com', password: 'battery-staple' };

/** Straight through the front door: log in, then use what you were given. */
async function meAfterLogin(credentials: { email: string; password: string }) {
  const login = await request(server).post('/login').send(credentials);
  const token = (login.body as { token?: string }).token ?? '';

  return request(server).get('/me').set('Authorization', `Bearer ${token}`);
}

describe('the protected route answers with the user behind the token', () => {
  it('returns 200 and that user', async () => {
    const response = await meAfterLogin(ADA);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 1, email: 'ada@example.com', name: 'Ada Bell' });
  });

  it('returns the other user for the other token', async () => {
    const response = await meAfterLogin(BRUNO);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: 2, email: 'bruno@example.com' });
  });

  it('leaves the password hash out of the body', async () => {
    const response = await meAfterLogin(ADA);
    const body = response.body as Record<string, unknown>;

    expect(body.passwordHash).toBeUndefined();
    expect(JSON.stringify(body)).not.toContain('scrypt$');
  });
});
