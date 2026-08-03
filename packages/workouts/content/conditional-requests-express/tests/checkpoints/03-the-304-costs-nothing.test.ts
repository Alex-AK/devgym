import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Sales } from '../../src/server/sales';

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

describe('the 304 costs nothing to produce', () => {
  it('does not assemble the report to answer a revalidation', async () => {
    const tag = (await get()).headers.etag ?? UNKNOWN;
    const buildsBefore = sales.builds;

    for (let i = 1; i <= 10; i += 1) {
      const response = await get({ 'If-None-Match': tag });
      expect(response.status, `revalidation ${i} came back ${response.status}`).toBe(304);
    }

    const built = sales.builds - buildsBefore;
    expect(built, `ten revalidations built the report ${built} times`).toBe(0);
  });

  it('assembles it once there is something new to send', async () => {
    const tag = (await get()).headers.etag ?? UNKNOWN;
    sales.recordSale('east', 'SKU-0003', 4);
    const buildsBefore = sales.builds;

    const response = await get({ 'If-None-Match': tag });

    expect(response.status).toBe(200);
    const built = sales.builds - buildsBefore;
    expect(built, `the report the caller was sent was built ${built} times`).toBe(1);
  });
});
