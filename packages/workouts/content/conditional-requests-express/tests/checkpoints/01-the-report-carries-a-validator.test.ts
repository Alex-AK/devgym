import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Sales } from '../../src/server/sales';

const ROWS = 2400;

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
