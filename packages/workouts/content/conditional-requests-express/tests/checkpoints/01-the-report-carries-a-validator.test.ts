import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Sales } from '../../src/server/sales';

const ROWS = 2400;

let sales: Sales;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  sales = new Sales();
  app = createApp(sales);
});

const get = (headers: Record<string, string> = {}) => request(app).get('/report').set(headers);

describe('the report comes back with a validator', () => {
  it('still answers with the whole report', async () => {
    const response = await get();

    expect(response.status).toBe(200);
    expect(response.body.rows).toHaveLength(ROWS);
    expect(response.body.totalUnits).toBe(new Sales().buildReport().totalUnits);
  });

  it('sets an ETag on it', async () => {
    const { etag } = (await get()).headers;

    expect(etag, 'the response carried no ETag').toBeDefined();
    expect(etag, `an entity tag is a quoted string, and this one is ${etag}`).toMatch(
      /^(W\/)?"[^"]+"$/
    );
  });

  it('sends the same tag while the data is unchanged', async () => {
    const first = (await get()).headers.etag;
    const second = (await get()).headers.etag;

    expect(second, 'two identical reports came back with different tags').toBe(first);
  });

  it('sends a different tag once a sale lands', async () => {
    const before = (await get()).headers.etag;
    sales.recordSale('north', 'SKU-0001', 3);
    const after = (await get()).headers.etag;

    expect(after, 'the tag survived a change to the report').not.toBe(before);
  });
});
