import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { listQuerySchema } from '../../src/server/list-orders';
import { Orders, type Order } from '../../src/server/orders';

let orders: Orders;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the whole suite: see the note in checkpoint 1.
beforeEach(() => {
  orders = new Orders();
  server = createApp(orders).listen(0);
});

afterEach(() => {
  server.close();
});

const get = (query: string) => request(server).get(`/orders${query}`);

describe('the endpoint works from the parsed query, not the raw one', () => {
  it('runs the listing with what the schema makes of the query', async () => {
    const response = await get('?page=2&perPage=5&status=paid&sort=oldest&includeArchived=true');

    expect(response.status).toBe(200);
    expect(
      response.body.query,
      'the schema and the endpoint disagree about what that query means'
    ).toEqual(
      listQuerySchema.parse({
        page: '2',
        perPage: '5',
        status: 'paid',
        sort: 'oldest',
        includeArchived: 'true',
      })
    );
  });

  it('answers with numbers and booleans rather than the strings that arrived', async () => {
    const { query } = (await get('?page=2&perPage=5&includeArchived=true')).body;

    expect(typeof query.page, `page came back as ${JSON.stringify(query.page)}`).toBe('number');
    expect(typeof query.perPage).toBe('number');
    expect(typeof query.includeArchived).toBe('boolean');
  });

  it('fills in the defaults when the query is empty', async () => {
    const { query } = (await get('')).body;

    expect(query).toEqual({ page: 1, perPage: 20, sort: 'newest', includeArchived: false });
    expect(query).toEqual(listQuerySchema.parse({}));
  });

  it('reads includeArchived=false as false', async () => {
    const response = await get('?includeArchived=false&perPage=100');

    expect(response.body.query.includeArchived).toBe(false);
    expect(
      response.body.orders.some((order: Order) => order.archived),
      'the list held archived orders after being asked not to'
    ).toBe(false);
  });

  it('carries nothing the schema did not ask for', async () => {
    const { query } = (
      await get('?page=1&perPage=5&status=paid&sort=newest&includeArchived=true&admin=true')
    ).body;

    expect(Object.keys(query).sort()).toEqual([
      'includeArchived',
      'page',
      'perPage',
      'sort',
      'status',
    ]);
  });
});
