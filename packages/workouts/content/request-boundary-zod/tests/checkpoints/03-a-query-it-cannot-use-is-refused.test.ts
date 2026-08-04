import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Orders } from '../../src/server/orders';

let orders: Orders;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the whole suite: see the note in checkpoint 1. This one
// sends eight requests in a loop, which is where `request(app)` bites.
beforeEach(() => {
  orders = new Orders();
  server = createApp(orders).listen(0);
});

afterEach(() => {
  server.close();
});

const get = (query: string) => request(server).get(`/orders${query}`);

const REFUSABLE = [
  '?page=abc',
  '?page=0',
  '?page=1.5',
  '?perPage=500',
  '?perPage=0',
  '?status=nope',
  '?sort=sideways',
  '?includeArchived=maybe',
];

describe('a query the endpoint cannot use never reaches the listing', () => {
  it('answers 400 to every one of them', async () => {
    for (const query of REFUSABLE) {
      const response = await get(query);
      expect(response.status, `GET /orders${query} answered ${response.status}`).toBe(400);
    }
  });

  it('builds no listing for one', async () => {
    for (const query of REFUSABLE) await get(query);

    expect(orders.listed, 'a query that should have been refused reached the listing').toBe(0);
  });

  it('still builds one for a query it can use', async () => {
    const response = await get('?page=2&perPage=5&status=paid');

    expect(response.status).toBe(200);
    expect(orders.listed).toBe(1);
  });
});
