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

describe('the same key replays the first answer', () => {
  it('does not charge the card a second time', async () => {
    await pay('pay_1');
    await pay('pay_1');

    expect(gateway.charges, 'the retry charged the customer again').toHaveLength(1);
  });

  it('answers the retry with what the first request answered', async () => {
    const first = await pay('pay_1');
    const retry = await pay('pay_1');

    expect(retry.status, 'a replayed create is still the status it was').toBe(201);
    expect(retry.body).toEqual(first.body);
  });

  it('keeps replaying, however many times the client retries', async () => {
    const first = await pay('pay_1');

    for (let i = 1; i <= 5; i += 1) {
      const retry = await pay('pay_1');
      expect(retry.body, `retry ${i} answered with something else`).toEqual(first.body);
    }

    expect(gateway.charges).toHaveLength(1);
  });

  it('charges again for a key it has not seen', async () => {
    const first = await pay('pay_1');
    const second = await pay('pay_2');

    expect(second.status).toBe(201);
    expect(gateway.charges, 'a new key is a new payment, identical body or not').toHaveLength(2);
    expect(second.body.id).not.toBe(first.body.id);
  });

  it('keeps the two payments apart afterwards', async () => {
    const first = await pay('pay_1');
    const second = await pay('pay_2');

    expect((await pay('pay_1')).body).toEqual(first.body);
    expect((await pay('pay_2')).body).toEqual(second.body);
    expect(gateway.charges).toHaveLength(2);
  });
});
