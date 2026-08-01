import { jwtVerify } from 'jose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { SECRET_KEY } from '../../src/server/config';

const ADA = { email: 'ada@example.com', password: 'correct-horse' };

async function tokenFromLogin(): Promise<string> {
  const response = await request(createApp()).post('/login').send(ADA);
  return (response.body as { token?: string }).token ?? '';
}

describe('a correct login gets a signed token back', () => {
  it('answers 200 with a token', async () => {
    const response = await request(createApp()).post('/login').send(ADA);

    expect(response.status).toBe(200);
    expect(typeof (response.body as { token?: unknown }).token).toBe('string');
  });

  it('signs it with this app secret', async () => {
    await expect(jwtVerify(await tokenFromLogin(), SECRET_KEY)).resolves.toBeTruthy();
  });

  it('puts the user id in the subject claim', async () => {
    const { payload } = await jwtVerify(await tokenFromLogin(), SECRET_KEY);
    expect(payload.sub).toBe('1');
  });

  it('gives the token an expiry, and not a generous one', async () => {
    const { payload } = await jwtVerify(await tokenFromLogin(), SECRET_KEY);
    const now = Math.floor(Date.now() / 1000);

    expect(payload.exp, 'the token never expires').toBeDefined();
    expect(payload.exp ?? 0).toBeGreaterThan(now);
    expect(payload.exp ?? 0, 'an hour is already generous for an access token').toBeLessThanOrEqual(
      now + 3600
    );
  });
});
