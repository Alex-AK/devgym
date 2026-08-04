import { describe, expect, it, vi } from 'vitest';

import { answers, get } from '../support/downstream';
import { harness } from '../support/harness';
import { complete, randoms } from '../support/run';

describe('the wait doubles, with jitter', () => {
  it('waits for nothing before the first attempt', async () => {
    const { clock, client } = harness([answers(200)], {}, () => 1);

    await complete(client.request(get('/orders')), clock);

    expect(clock.sleeps, 'the first attempt has nothing to back off from').toEqual([]);
  });

  it('waits once between attempts, and doubles the window each time', async () => {
    const { clock, client } = harness(
      [answers(503)],
      { maxAttempts: 6, baseMs: 100, capMs: 2_000 },
      () => 1
    );

    await complete(client.request(get('/orders')), clock);

    expect(clock.sleeps).toEqual([100, 200, 400, 800, 1_600]);
  });

  it('stops doubling at the cap', async () => {
    const { clock, client } = harness(
      [answers(503)],
      { maxAttempts: 6, baseMs: 100, capMs: 500 },
      () => 1
    );

    await complete(client.request(get('/orders')), clock);

    expect(clock.sleeps).toEqual([100, 200, 400, 500, 500]);
  });

  it('waits somewhere inside the window rather than all of it', async () => {
    const { clock, client } = harness(
      [answers(503)],
      { maxAttempts: 4, baseMs: 100, capMs: 2_000 },
      randoms(0.25, 0.5, 0.75)
    );

    await complete(client.request(get('/orders')), clock);

    expect(clock.sleeps, 'full jitter multiplies the whole window').toEqual([25, 100, 300]);
  });

  it('waits for nothing at all when the jitter comes out at zero', async () => {
    const { clock, client } = harness([answers(503)], { maxAttempts: 3 }, () => 0);

    await complete(client.request(get('/orders')), clock);

    expect(clock.sleeps, 'a window with jitter added to it is not full jitter').toEqual([0, 0]);
  });

  it('takes Retry-After over its own formula', async () => {
    const random = vi.fn(() => 1);
    const { clock, client } = harness(
      [answers(503, { 'retry-after': '2' }), answers(200)],
      {},
      random
    );

    const result = await complete(client.request(get('/orders')), clock);

    expect(result).toMatchObject({ status: 200 });
    expect(clock.sleeps).toEqual([2_000]);
    expect(random, 'the downstream said how long to wait').not.toHaveBeenCalled();
  });
});
