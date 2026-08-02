import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Sales } from '../../src/server/sales';

const UNKNOWN = '"not-a-tag-this-service-ever-sent"';

let sales: Sales;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  sales = new Sales();
  app = createApp(sales);
});

const get = (headers: Record<string, string> = {}) => request(app).get('/report').set(headers);

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
