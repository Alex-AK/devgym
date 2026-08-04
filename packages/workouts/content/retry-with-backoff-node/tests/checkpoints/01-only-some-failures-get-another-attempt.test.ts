import { describe, expect, it } from 'vitest';

import { GaveUpError } from '../../src/lib/errors';
import { answers, drops, get, post, put } from '../support/downstream';
import { harness } from '../support/harness';
import { complete, PENDING } from '../support/run';

describe('only some failures get another attempt', () => {
  it('hands back a good answer after one attempt', async () => {
    const { clock, client, downstream } = harness([answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result, 'the call never came back').not.toBe(PENDING);
    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length).toBe(1);
  });

  it('sends it again after a 503, and answers with the attempt that worked', async () => {
    const { clock, client, downstream } = harness([answers(503), answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length, 'a 503 is the downstream saying it did not run this').toBe(
      2
    );
    expect(downstream.received[1], 'the second attempt is the same request').toEqual(
      downstream.received[0]
    );
  });

  it('sends it again after a 429', async () => {
    const { clock, client, downstream } = harness([answers(429), answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length).toBe(2);
  });

  it('hands a 400 straight back without sending it again', async () => {
    const { clock, client, downstream } = harness([answers(400), answers(200)]);

    const result = await complete(client.request(get('/orders?limit=soon')), clock);

    expect(result, 'the same request gets the same 400 every time').toMatchObject({ status: 400 });
    expect(downstream.received.length).toBe(1);
  });

  it('hands a 500 straight back without sending it again', async () => {
    const { clock, client, downstream } = harness([answers(500), answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 500 });
    expect(downstream.received.length).toBe(1);
  });

  it('sends a read again when the connection died before an answer', async () => {
    const { clock, client, downstream } = harness([drops(), answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length).toBe(2);
  });

  it('sends a PUT again when the connection died before an answer', async () => {
    const { clock, client, downstream } = harness([drops(), answers(200)]);

    const result = await complete(client.request(put('/orders/7')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length, 'a PUT twice is a PUT once').toBe(2);
  });

  it('will not send a write again when it never got an answer', async () => {
    const { clock, client, downstream } = harness([drops(), answers(201)]);

    const result = await complete(client.request(post('/charges')), clock);

    expect(downstream.received.length, 'the charge may already have gone through').toBe(1);
    expect(result).toBeInstanceOf(GaveUpError);
    expect(result).toMatchObject({ reason: 'not-safe-to-retry', attempts: 1 });
  });

  it('sends a write again when it carries an idempotency key', async () => {
    const { clock, client, downstream } = harness([drops(), answers(201)]);

    const result = await complete(
      client.request(post('/charges', { 'idempotency-key': 'ik_7f2' })),
      clock
    );

    expect(result).toMatchObject({ status: 201 });
    expect(downstream.received.length).toBe(2);
  });

  it('sends a write again when the downstream answered 503', async () => {
    const { clock, client, downstream } = harness([answers(503), answers(201)]);

    const result = await complete(client.request(post('/charges')), clock);

    expect(result, 'the downstream answered, so it did not run the charge').toMatchObject({
      status: 201,
    });
    expect(downstream.received.length).toBe(2);
  });
});
