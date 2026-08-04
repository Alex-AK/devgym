import 'reflect-metadata';

import { decodeJwt } from 'jose';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionStore } from '../../src/server/session-store';
import { boot, type Harness, login, me, refresh } from '../support/app';

let harness: Harness;

beforeEach(async () => {
  harness = await boot();
}, 60_000);

afterEach(async () => {
  await harness.app.close();
});

describe('refreshing rotates the refresh token', () => {
  it('answers with a refresh token that is not the one it was given', async () => {
    const first = await login(harness.server);

    const response = await refresh(harness.server, first.refreshToken);

    expect(response.status).toBe(200);
    expect(typeof response.body.accessToken).toBe('string');
    expect(response.body.refreshToken).not.toBe(first.refreshToken);
  });

  it('lets the token it just handed out be used in turn', async () => {
    const first = await login(harness.server);

    const second = await refresh(harness.server, first.refreshToken);
    expect(second.status).toBe(200);

    const third = await refresh(harness.server, second.body.refreshToken);

    expect(third.status).toBe(200);
    expect(third.body.refreshToken).not.toBe(second.body.refreshToken);
  });

  it('leaves the token it replaced worth nothing', async () => {
    const first = await login(harness.server);
    expect((await refresh(harness.server, first.refreshToken)).status).toBe(200);

    const again = await refresh(harness.server, first.refreshToken);

    expect(again.status, 'the token it replaced still works').toBe(401);
    expect(again.body.refreshToken, 'it was answered with a new pair anyway').toBeUndefined();
  });

  it('refreshes the session rather than starting another one', async () => {
    const first = await login(harness.server);

    const second = await refresh(harness.server, first.refreshToken);
    expect(second.status).toBe(200);

    expect(
      decodeJwt(second.body.accessToken as string).sid,
      'the refresh opened a second session instead of carrying the first one on'
    ).toBe(decodeJwt(first.accessToken).sid);
    expect(harness.app.get(SessionStore).sessionsFor(1)).toHaveLength(1);
  });

  it('does not log the session out on the way through', async () => {
    const first = await login(harness.server);
    expect((await refresh(harness.server, first.refreshToken)).status).toBe(200);

    const response = await me(harness.server, first.accessToken);

    expect(response.status, 'the access token from before the refresh stopped working').toBe(200);
  });

  it('401s on a refresh token it has never seen, and on none at all', async () => {
    const junk = await refresh(harness.server, 'a-refresh-token-from-nowhere');
    const missing = await request(harness.server).post('/auth/refresh').send({});

    expect(junk.status, 'an unrecognised refresh token is a 401, not a 500').toBe(401);
    expect(missing.status).toBe(401);
  });
});
