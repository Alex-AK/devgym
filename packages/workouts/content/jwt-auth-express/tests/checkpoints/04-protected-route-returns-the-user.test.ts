import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';

const ADA = { email: 'ada@example.com', password: 'correct-horse' };
const BRUNO = { email: 'bruno@example.com', password: 'battery-staple' };

/** Straight through the front door: log in, then use what you were given. */
async function meAfterLogin(credentials: { email: string; password: string }) {
  const app = createApp();
  const login = await request(app).post('/login').send(credentials);
  const token = (login.body as { token?: string }).token ?? '';

  return request(app).get('/me').set('Authorization', `Bearer ${token}`);
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
