import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { boot, type Harness, login, me, refresh } from '../support/app';

let harness: Harness;

beforeEach(async () => {
  harness = await boot();
}, 60_000);

afterEach(async () => {
  await harness.app.close();
});

/**
 * Somebody else has a copy of a refresh token. Whoever gets there second is
 * holding a value that has already been spent, and from the server there is no
 * telling which of the two is the person who logged in.
 */
describe('a refresh token that turns up twice ends the session', () => {
  it('refuses the second time it is presented', async () => {
    const laptop = await login(harness.server);
    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(200);

    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(401);
  });

  it('ends the session, so the token handed out in the meantime dies too', async () => {
    const laptop = await login(harness.server);
    const rotated = await refresh(harness.server, laptop.refreshToken);
    expect(rotated.status).toBe(200);

    await refresh(harness.server, laptop.refreshToken);

    const response = await refresh(harness.server, rotated.body.refreshToken);
    expect(
      response.status,
      'the replay was turned down and the session carried on regardless'
    ).toBe(401);
  });

  it('stops that session"s access tokens on their next request', async () => {
    const laptop = await login(harness.server);
    const rotated = await refresh(harness.server, laptop.refreshToken);
    expect(rotated.status).toBe(200);

    await refresh(harness.server, laptop.refreshToken);

    expect((await me(harness.server, rotated.body.accessToken)).status).toBe(401);
    expect((await me(harness.server, laptop.accessToken)).status).toBe(401);
  });

  it('leaves that person"s other sessions alone', async () => {
    const laptop = await login(harness.server);
    const phone = await login(harness.server);

    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(200);
    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(401);

    expect(
      (await me(harness.server, phone.accessToken)).status,
      'a replay on the laptop logged the phone out as well'
    ).toBe(200);
    expect((await refresh(harness.server, phone.refreshToken)).status).toBe(200);
  });
});
