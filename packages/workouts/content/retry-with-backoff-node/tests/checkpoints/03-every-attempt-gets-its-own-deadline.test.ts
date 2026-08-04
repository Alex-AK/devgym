import { describe, expect, it } from 'vitest';

import { answers, get, hangs } from '../support/downstream';
import { harness } from '../support/harness';
import { complete, PENDING } from '../support/run';

describe('every attempt gets its own deadline', () => {
  it('gives up on an attempt the downstream never answers', async () => {
    const { clock, client, downstream } = harness([hangs(), answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result, 'still waiting on a downstream that never answers').not.toBe(PENDING);
    expect(result).toMatchObject({ status: 200 });
    expect(downstream.received.length).toBe(2);
  });

  it('arms a fresh deadline for every attempt', async () => {
    const { clock, client, downstream } = harness([hangs()], { maxAttempts: 3, timeoutMs: 250 });

    await complete(client.request(get('/orders')), clock);

    expect(downstream.received.length, 'every attempt has to end for the next to start').toBe(3);
    expect(clock.deadlines, 'one deadline made for the whole call is spent by the second').toEqual([
      250, 250, 250,
    ]);
  });

  it('calls the attempt off rather than walking away from it', async () => {
    const { clock, client, downstream } = harness([hangs()], { maxAttempts: 3 });

    await complete(client.request(get('/orders')), clock);

    expect(downstream.aborted, 'the downstream is still working on all three').toBe(3);
  });

  it('leaves an attempt that answers in time alone', async () => {
    const { clock, client, downstream } = harness([answers(200)]);

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(downstream.aborted, 'the attempt had already answered').toBe(0);
  });

  it('spends one whole timeout on each attempt and no more', async () => {
    const { clock, client } = harness([hangs()], { maxAttempts: 3, timeoutMs: 250 }, () => 0);

    await complete(client.request(get('/orders')), clock);

    expect(clock.now(), 'three attempts of 250ms, and no jitter between them').toBe(750);
  });
});
