import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { createDb } from '../../src/server/db';
import { FakeGateway } from '../../src/server/gateway';

const PAYMENT = { customerId: 'cus_9', amountCents: 2500, currency: 'gbp' };

let gateway: FakeGateway;
let app: ReturnType<typeof createApp>;

beforeEach(() => {
  gateway = new FakeGateway();
  app = createApp(createDb(), gateway);
});

const pay = (key: string) =>
  request(app).post('/payments').set('Idempotency-Key', key).send(PAYMENT);

describe('a payment charges the card once', () => {
  it('answers 201 with the payment', async () => {
    const response = await pay('pay_1');

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      customerId: 'cus_9',
      amountCents: 2500,
      currency: 'gbp',
      status: 'succeeded',
    });
    expect(typeof response.body.id, 'the client needs something to refer to the payment by').toBe(
      'string'
    );
  });

  it('charges the card the amount that was asked for', async () => {
    await pay('pay_1');

    expect(gateway.charges).toHaveLength(1);
    expect(gateway.charges[0]).toMatchObject({ amountCents: 2500, currency: 'gbp' });
  });

  it('refuses a request with no Idempotency-Key', async () => {
    const response = await request(app).post('/payments').send(PAYMENT);

    expect(response.status).toBe(400);
    expect(gateway.charges, 'a payment nobody can identify was charged anyway').toHaveLength(0);
  });

  it('refuses an empty Idempotency-Key the same way', async () => {
    const response = await request(app)
      .post('/payments')
      .set('Idempotency-Key', '   ')
      .send(PAYMENT);

    expect(response.status).toBe(400);
    expect(gateway.charges).toHaveLength(0);
  });
});
