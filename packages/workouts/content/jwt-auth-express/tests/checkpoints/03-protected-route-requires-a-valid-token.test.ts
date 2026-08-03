import { SignJWT } from 'jose';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { SECRET_KEY } from '../../src/server/config';

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

const SOMEONE_ELSES_SECRET = new TextEncoder().encode('a secret this app has never seen');
const now = () => Math.floor(Date.now() / 1000);

function sign(secret: Uint8Array, subject: string, expiresAt: number): Promise<string> {
  return new SignJWT({ email: 'ada@example.com' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(subject)
    .setIssuedAt(expiresAt - 900)
    .setExpirationTime(expiresAt)
    .sign(secret);
}

function me(header?: string) {
  const call = request(server).get('/me');
  return header ? call.set('Authorization', header) : call;
}

describe('the protected route refuses everything that is not a live token', () => {
  it('401s when there is no Authorization header', async () => {
    expect((await me()).status).toBe(401);
  });

  it('401s on a header that is not a bearer token', async () => {
    expect((await me('Basic YWRhOmNvcnJlY3QtaG9yc2U=')).status).toBe(401);
  });

  it('401s on something that is not a JWT at all', async () => {
    expect((await me('Bearer not-really-a-token')).status).toBe(401);
  });

  it('401s on a token somebody else signed', async () => {
    const forged = await sign(SOMEONE_ELSES_SECRET, '1', now() + 900);
    expect((await me(`Bearer ${forged}`)).status).toBe(401);
  });

  it('401s on a token of ours that has expired', async () => {
    const stale = await sign(SECRET_KEY, '1', now() - 60);
    expect((await me(`Bearer ${stale}`)).status).toBe(401);
  });

  it('401s on a well-signed token whose subject is nobody', async () => {
    const ghost = await sign(SECRET_KEY, '9999', now() + 900);
    expect((await me(`Bearer ${ghost}`)).status).toBe(401);
  });

  it('never answers a bad token with a 500', async () => {
    const responses = await Promise.all([
      me(),
      me('Bearer not-really-a-token'),
      me(`Bearer ${await sign(SOMEONE_ELSES_SECRET, '1', now() + 900)}`),
    ]);

    for (const response of responses) {
      expect(response.status, 'a rejected token is a 401, not a server error').toBeLessThan(500);
    }
  });
});
