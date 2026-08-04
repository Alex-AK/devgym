import { describe, expect, it } from 'vitest';

import { GaveUpError } from '../../src/lib/errors';
import { answers, drops, get, hangs } from '../support/downstream';
import { harness } from '../support/harness';
import { complete } from '../support/run';

describe('it gives up, and says why', () => {
  it('stops after the last attempt and says how many it made', async () => {
    const { clock, client, downstream } = harness([answers(503)], { maxAttempts: 3 });

    const result = await complete(client.request(get('/orders')), clock);

    expect(downstream.received.length, 'three attempts, and a fourth is not allowed').toBe(3);
    expect(result, 'a 503 handed back reads as an answer to the caller').toBeInstanceOf(
      GaveUpError
    );
    expect(result).toMatchObject({ reason: 'out-of-attempts', attempts: 3, lastStatus: 503 });
  });

  it('answers normally when the last attempt is the one that works', async () => {
    const { clock, client, downstream } = harness([answers(503), answers(503), answers(200)], {
      maxAttempts: 3,
    });

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length).toBe(3);
  });

  it('reports no status when the last attempt never got one', async () => {
    const { clock, client } = harness([drops()], { maxAttempts: 2 });

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ reason: 'out-of-attempts', attempts: 2, lastStatus: null });
  });

  it('will not start an attempt the budget cannot cover', async () => {
    const { clock, client, downstream } = harness([hangs()], {
      maxAttempts: 4,
      timeoutMs: 250,
      budgetMs: 600,
    });

    const result = await complete(client.request(get('/orders')), clock);

    expect(downstream.received.length, 'a third attempt could not have finished in time').toBe(2);
    expect(result).toMatchObject({ reason: 'out-of-budget', attempts: 2 });
  });

  it('counts a long Retry-After against the budget', async () => {
    const { clock, client, downstream } = harness([answers(503, { 'retry-after': '30' })], {
      maxAttempts: 4,
      budgetMs: 5_000,
    });

    const result = await complete(client.request(get('/orders')), clock);

    expect(downstream.received.length, 'it was asked for thirty seconds and had five').toBe(1);
    expect(result).toMatchObject({ reason: 'out-of-budget', attempts: 1, lastStatus: 503 });
  });
});
