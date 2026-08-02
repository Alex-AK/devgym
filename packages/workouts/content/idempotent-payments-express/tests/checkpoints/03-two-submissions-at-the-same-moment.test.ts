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

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Supertest only sends a request when something awaits it, so a checkpoint that
 * needs two of them in the air at once has to kick each one off itself.
 */
const send = (key: string) =>
  request(app)
    .post('/payments')
    .set('Idempotency-Key', key)
    .send(PAYMENT)
    .then((response) => response);

/**
 * One payment, submitted twice, the second landing while the first is still
 * inside the gateway. That is the double-clicked button in slow motion.
 */
async function doubleSubmit() {
  gateway.hold();

  const charging = gateway.nextCharge();
  const first = send('pay_1');
  await Promise.race([charging, sleep(1000)]);
  expect(gateway.charges, 'the first payment never reached the card gateway').toHaveLength(1);

  const second = send('pay_1');
  // By now the second request has answered, unless it is waiting on a charge of
  // its own, in which case nothing more happens until the gateway lets it go.
  await Promise.race([second, sleep(100)]);
  gateway.release();

  return Promise.all([first, second]);
}

describe('two submissions at the same moment', () => {
  it('charges the card once', async () => {
    await doubleSubmit();

    expect(gateway.charges, 'both submissions charged the card').toHaveLength(1);
  });

  it('tells the second one the first is still in progress', async () => {
    const [first, second] = await doubleSubmit();

    expect(first.status).toBe(201);
    expect(second.status, 'the second submission found work already under way').toBe(409);
    expect(second.body.id, 'it was answered as though it had paid').toBeUndefined();
  });

  it('replays the one payment to everything that comes afterwards', async () => {
    const [first] = await doubleSubmit();

    const later = await send('pay_1');

    expect(later.status, 'the key was left in progress with nothing to replay').toBe(201);
    expect(later.body).toEqual(first.body);
    expect(gateway.charges).toHaveLength(1);
  });
});
