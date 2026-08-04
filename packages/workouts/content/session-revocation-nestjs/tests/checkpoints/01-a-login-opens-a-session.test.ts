import 'reflect-metadata';

import { decodeJwt } from 'jose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionStore } from '../../src/server/session-store';
import { boot, type Harness, login, me, NADIA } from '../support/app';

/**
 * The half that arrives working. It is here as the thing you have to not break:
 * rotation and revocation both run through the same guard and the same store.
 */
let harness: Harness;

beforeEach(async () => {
  harness = await boot();
}, 60_000);

afterEach(async () => {
  await harness.app.close();
});

describe('a login opens a session and its access token gets in', () => {
  it('answers with an access token and a refresh token', async () => {
    const response = await request(harness.server).post('/auth/login').send(NADIA);

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(typeof response.body.refreshToken).toBe('string');
    expect((response.body.refreshToken as string).length).toBeGreaterThan(20);
  });

  it('opens GET /me for whoever logged in', async () => {
    const { accessToken } = await login(harness.server);

    const response = await me(harness.server, accessToken);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ email: 'nadia@example.com', id: 1, name: 'Nadia Okoro' });
    expect(JSON.stringify(response.body), 'the password hash came back with it').not.toContain(
      'scrypt'
    );
  });

  it('refuses /me without a live access token, with 401 rather than 403', async () => {
    const nothing = await request(harness.server).get('/me');
    const basic = await request(harness.server).get('/me').set('Authorization', 'Basic bmFkaWE6');
    const junk = await me(harness.server, 'not-a-token-at-all');

    for (const response of [nothing, basic, junk]) {
      expect(response.status, 'a guard that returns false answers 403').toBe(401);
    }
  });

  it('opens no session when the credentials are wrong', async () => {
    const wrongPassword = await request(harness.server)
      .post('/auth/login')
      .send({ email: NADIA.email, password: 'not-it' });
    const noSuchAccount = await request(harness.server)
      .post('/auth/login')
      .send({ email: 'nobody@example.com', password: NADIA.password });

    expect(wrongPassword.status).toBe(401);
    expect(noSuchAccount.status).toBe(401);
    expect(wrongPassword.body, 'the two answers say which addresses are registered').toEqual(
      noSuchAccount.body
    );
    expect(harness.app.get(SessionStore).sessionsFor(1)).toEqual([]);
  });

  it('gives a second login a session of its own', async () => {
    const laptop = await login(harness.server);
    const phone = await login(harness.server);

    expect(decodeJwt(laptop.accessToken).sid).not.toBe(decodeJwt(phone.accessToken).sid);
    expect(harness.app.get(SessionStore).sessionsFor(1)).toHaveLength(2);
    expect((await me(harness.server, phone.accessToken)).status).toBe(200);
  });
});
