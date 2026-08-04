import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Orders, type Order } from '../../src/server/orders';

let orders: Orders;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

// One listener for the whole suite, not one per request. supertest binds a
// fresh ephemeral port every time it is handed an app, so a suite that loops
// requests opens a socket per assertion and starts failing as `socket hang up`
// once those ports are still in TIME_WAIT.
beforeEach(() => {
  orders = new Orders();
  server = createApp(orders).listen(0);
});

afterEach(() => {
  server.close();
});

const get = (query: string) => request(server).get(`/orders${query}`);

const refs = (list: { reference: string }[]): string[] => list.map((order) => order.reference);
const visible = (list: Order[]): Order[] => list.filter((order) => !order.archived);
const newestFirst = (list: Order[]): Order[] => [...list].reverse();

describe('the list pages, filters and sorts the way it was asked', () => {
  it('answers a bare request with the first twenty, newest first', async () => {
    const response = await get('');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(visible(orders.all).length);
    expect(refs(response.body.orders)).toEqual(refs(newestFirst(visible(orders.all)).slice(0, 20)));
  });

  it('gives back the page that was asked for, and only that page', async () => {
    const response = await get('?page=2&perPage=5');

    expect(response.status).toBe(200);
    expect(response.body.orders, 'page 2 of 5 should hold five orders').toHaveLength(5);
    expect(refs(response.body.orders)).toEqual(refs(newestFirst(visible(orders.all)).slice(5, 10)));
  });

  it('filters by status', async () => {
    const response = await get('?status=shipped&perPage=100');
    const shipped = visible(orders.all).filter((order) => order.status === 'shipped');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(shipped.length);
    expect(refs(response.body.orders)).toEqual(refs(newestFirst(shipped)));
  });

  it('sorts the other way when asked', async () => {
    const response = await get('?sort=oldest&perPage=3');

    expect(response.status).toBe(200);
    expect(refs(response.body.orders)).toEqual(refs(visible(orders.all).slice(0, 3)));
  });

  it('takes the archived orders in when asked', async () => {
    const response = await get('?includeArchived=true&perPage=100');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(orders.all.length);
    expect(response.body.orders.some((order: Order) => order.archived)).toBe(true);
  });
});
