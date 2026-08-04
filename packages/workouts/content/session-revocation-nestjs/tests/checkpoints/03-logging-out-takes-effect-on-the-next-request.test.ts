import 'reflect-metadata';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  boot,
  type Harness,
  login,
  logout,
  logoutEverywhere,
  me,
  NADIA,
  RAF,
  refresh,
} from '../support/app';

let harness: Harness;

beforeEach(async () => {
  harness = await boot();
}, 60_000);

afterEach(async () => {
  await harness.app.close();
});

describe('logging out takes effect on the next request', () => {
  it('answers 204 whatever it was handed', async () => {
    const laptop = await login(harness.server);

    expect((await logout(harness.server, laptop.refreshToken)).status).toBe(204);
    expect(
      (await logout(harness.server, 'a refresh token from nowhere')).status,
      'the answer says whether that token was worth anything'
    ).toBe(204);
  });

  it('stops the access token of the session that was logged out', async () => {
    const laptop = await login(harness.server);
    expect((await me(harness.server, laptop.accessToken)).status).toBe(200);

    expect((await logout(harness.server, laptop.refreshToken)).status).toBe(204);

    const response = await me(harness.server, laptop.accessToken);
    expect(
      response.status,
      'the access token still opens /me after the logout, and it is nowhere near expiring'
    ).toBe(401);
  });

  it('stops that session refreshing as well', async () => {
    const laptop = await login(harness.server);

    await logout(harness.server, laptop.refreshToken);

    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(401);
  });

  it('leaves the same person"s other session alone', async () => {
    const laptop = await login(harness.server);
    const phone = await login(harness.server);

    await logout(harness.server, laptop.refreshToken);

    expect(
      (await me(harness.server, phone.accessToken)).status,
      'logging out on the laptop logged out the phone too'
    ).toBe(200);
    expect((await refresh(harness.server, phone.refreshToken)).status).toBe(200);
  });

  it('logs out everywhere, the session doing the asking included', async () => {
    const laptop = await login(harness.server);
    const phone = await login(harness.server);

    expect((await logoutEverywhere(harness.server, phone.accessToken)).status).toBe(204);

    expect((await me(harness.server, laptop.accessToken)).status).toBe(401);
    expect(
      (await me(harness.server, phone.accessToken)).status,
      'the session that asked is still open'
    ).toBe(401);
    expect((await refresh(harness.server, laptop.refreshToken)).status).toBe(401);
  });

  it('logs out everywhere for one person and nobody else', async () => {
    const nadia = await login(harness.server, NADIA);
    const raf = await login(harness.server, RAF);

    await logoutEverywhere(harness.server, nadia.accessToken);

    expect(
      (await me(harness.server, raf.accessToken)).status,
      'everywhere reached other people"s sessions'
    ).toBe(200);
  });
});
