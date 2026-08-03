import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Sales } from '../../src/server/sales';

const ROWS = 2400;
/** No tag the endpoint could have sent, so it stands in for "never seen it". */
const UNKNOWN = '"not-a-tag-this-service-ever-sent"';

let sales: Sales;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the whole test, not one per request. supertest binds a fresh
// ephemeral port every time it is handed an app, and the loop below asks for ten
// revalidations, so `request(app)` left this suite opening a socket per
// assertion and failing under load once the ports were still in TIME_WAIT.
beforeEach(() => {
  sales = new Sales();
  server = createApp(sales).listen(0);
});

afterEach(() => {
  server.close();
});

const get = (headers: Record<string, string> = {}) => request(server).get('/report').set(headers);

/** What actually came down the wire as a body. */
const bodyBytes = (response: { text?: string }): number =>
  Buffer.byteLength(response.text ?? '', 'utf8');

async function tagFromAFreshCopy(): Promise<string> {
  return (await get()).headers.etag ?? UNKNOWN;
}

describe('a client that already has it gets nothing back', () => {
  it('answers 304 when the tag still matches', async () => {
    const response = await get({ 'If-None-Match': await tagFromAFreshCopy() });

    expect(response.status).toBe(304);
  });

  it('sends no body with the 304', async () => {
    const fresh = await get();
    const revalidated = await get({ 'If-None-Match': fresh.headers.etag ?? UNKNOWN });

    expect(bodyBytes(fresh), 'the 200 should still be the whole report').toBeGreaterThan(50_000);
    expect(
      bodyBytes(revalidated),
      `the revalidation carried ${bodyBytes(revalidated)} bytes of body`
    ).toBe(0);
  });

  it('answers 304 to a tag a cache has marked weak', async () => {
    const tag = await tagFromAFreshCopy();
    const weak = `W/${tag.replace(/^W\//, '')}`;

    expect((await get({ 'If-None-Match': weak })).status).toBe(304);
  });

  it('answers 304 to a list that holds the tag', async () => {
    const tag = await tagFromAFreshCopy();
    const list = `${UNKNOWN}, ${tag}, W/"older"`;

    expect((await get({ 'If-None-Match': list })).status).toBe(304);
  });

  it('sends the report to a caller holding a tag it has never sent', async () => {
    const response = await get({ 'If-None-Match': UNKNOWN });

    expect(response.status).toBe(200);
    expect(response.body.rows).toHaveLength(ROWS);
  });

  it('sends the report once the tag the caller holds has gone stale', async () => {
    const stale = await tagFromAFreshCopy();
    sales.recordSale('south', 'SKU-0002', 5);

    const response = await get({ 'If-None-Match': stale });

    expect(response.status, 'a changed report came back as 304').toBe(200);
    expect(response.body.rows).toHaveLength(ROWS);
    expect(response.headers.etag).not.toBe(stale);
  });
});
