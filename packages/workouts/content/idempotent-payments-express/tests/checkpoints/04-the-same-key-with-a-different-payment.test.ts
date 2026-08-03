import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { createDb } from '../../src/server/db';
import { FakeGateway } from '../../src/server/gateway';

const PAYMENT = { customerId: 'cus_9', amountCents: 2500, currency: 'gbp' };
const DEARER = { customerId: 'cus_9', amountCents: 9900, currency: 'gbp' };

let gateway: FakeGateway;
let app: ReturnType<typeof createApp>;
let server: ReturnType<ReturnType<typeof createApp>['listen']>;

beforeEach(() => {
  gateway = new FakeGateway();
  app = createApp(createDb(), gateway);
  server = app.listen(0);
});

// One listener per test, not one per request: supertest binds a fresh ephemeral
// port each time it is handed an app.
afterEach(() => {
  server.close();
});

const pay = (key: string, body: object) =>
  request(server).post('/payments').set('Idempotency-Key', key).send(body);

describe('the same key with a different payment', () => {
  it('refuses it with 422', async () => {
    await pay('pay_1', PAYMENT);
    const response = await pay('pay_1', DEARER);

    expect(response.status).toBe(422);
  });

  it('charges neither amount again', async () => {
    await pay('pay_1', PAYMENT);
    await pay('pay_1', DEARER);

    expect(gateway.charges).toHaveLength(1);
    expect(gateway.charges[0].amountCents, 'the customer paid for something else').toBe(2500);
  });

  it('does not answer with the first payment as though it were this one', async () => {
    const first = await pay('pay_1', PAYMENT);
    const response = await pay('pay_1', DEARER);

    expect(response.body, 'the client is told it paid 9900 when it paid 2500').not.toEqual(
      first.body
    );
  });

  it('replays the same payment written in a different order', async () => {
    const first = await pay('pay_1', PAYMENT);
    const reordered = await pay('pay_1', {
      currency: 'gbp',
      amountCents: 2500,
      customerId: 'cus_9',
    });

    expect(reordered.status, 'same payment, so it is a retry rather than a change').toBe(201);
    expect(reordered.body).toEqual(first.body);
    expect(gateway.charges).toHaveLength(1);
  });

  it('leaves the key replaying the payment it belongs to', async () => {
    const first = await pay('pay_1', PAYMENT);
    await pay('pay_1', DEARER);
    const retry = await pay('pay_1', PAYMENT);

    expect(retry.status).toBe(201);
    expect(retry.body).toEqual(first.body);
    expect(gateway.charges).toHaveLength(1);
  });
});
