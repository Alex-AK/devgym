import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { Orders } from '../../src/server/orders';

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

interface Issue {
  field: string;
  message: string;
}

describe('the 400 says which field, and what was wrong with it', () => {
  it('names the field, in a shape a client can render', async () => {
    const response = await get('?page=abc');

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_query');
    expect(Array.isArray(response.body.issues), 'issues should be an array').toBe(true);
    expect(response.body.issues).toHaveLength(1);

    const [issue] = response.body.issues as Issue[];
    expect(issue?.field).toBe('page');
    expect(typeof issue?.message).toBe('string');
    expect(issue?.message.length, 'the message has to say something').toBeGreaterThan(3);
  });

  it('names every field that is wrong, not only the first', async () => {
    const response = await get('?page=abc&perPage=500&status=nope');
    const fields = (response.body.issues as Issue[]).map((issue) => issue.field).sort();

    expect(response.status).toBe(400);
    expect(fields).toEqual(['page', 'perPage', 'status']);
  });

  it('says something of its own about each of them', async () => {
    const response = await get('?page=abc&perPage=500&status=nope');
    const messages = (response.body.issues as Issue[]).map((issue) => issue.message);

    expect(new Set(messages).size, 'three fields came back with the same message').toBe(3);
  });
});
