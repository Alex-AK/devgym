import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Clock } from '../../src/lib/clock';
import { Consumer, type RunOutcome } from '../../src/lib/consumer';
import { FakeQueue } from '../../src/lib/queue';

interface Job {
  documentId: string;
}

const VISIBILITY_MS = 30_000;
const OPTIONS = { maxReceiveCount: 3, heartbeatMs: 10_000 };

let clock: Clock;
let queue: FakeQueue<Job>;

beforeEach(() => {
  clock = new Clock();
  queue = new FakeQueue<Job>({ visibilityTimeoutMs: VISIBILITY_MS }, clock);
});

describe('a job that keeps failing stops circulating', () => {
  it('gives it maxReceiveCount deliveries and no more', async () => {
    queue.send({ documentId: 'doc-1' });
    const handler = vi.fn(() => Promise.reject(new Error('that file is not a document')));
    const consumer = new Consumer<Job>(queue, handler, OPTIONS, clock);

    const outcomes: RunOutcome[] = [];
    for (let attempt = 0; attempt < 5; attempt += 1) {
      outcomes.push(await consumer.runOnce());
      await clock.advance(VISIBILITY_MS);
    }

    expect(outcomes).toEqual(['failed', 'failed', 'dead-lettered', 'idle', 'idle']);
    expect(
      handler,
      'the queue kept handing out a job that was never going to work'
    ).toHaveBeenCalledTimes(OPTIONS.maxReceiveCount);
  });

  it('puts it in the dead-letter store, with what went wrong', async () => {
    queue.send({ documentId: 'doc-1' });
    const consumer = new Consumer<Job>(
      queue,
      () => Promise.reject(new Error('that file is not a document')),
      OPTIONS,
      clock
    );

    for (let attempt = 0; attempt < OPTIONS.maxReceiveCount; attempt += 1) {
      await consumer.runOnce();
      await clock.advance(VISIBILITY_MS);
    }

    const dead = queue.deadLetters();
    expect(dead).toHaveLength(1);
    expect(dead[0]?.body).toEqual({ documentId: 'doc-1' });
    expect(dead[0]?.receiveCount).toBe(OPTIONS.maxReceiveCount);
    expect(dead[0]?.reason, 'a job in here is read by a person, so say why it is').toContain(
      'not a document'
    );
    expect(queue.depth(), 'it is the dead-letter store or the queue, not both').toBe(0);
  });

  it('does not give up on a job that works in the end', async () => {
    queue.send({ documentId: 'doc-1' });
    let attempts = 0;
    const consumer = new Consumer<Job>(
      queue,
      async () => {
        attempts += 1;
        if (attempts < OPTIONS.maxReceiveCount) throw new Error('the converter is restarting');
      },
      OPTIONS,
      clock
    );

    await expect(consumer.runOnce()).resolves.toBe('failed');
    await clock.advance(VISIBILITY_MS);
    await expect(consumer.runOnce()).resolves.toBe('failed');
    await clock.advance(VISIBILITY_MS);
    await expect(consumer.runOnce()).resolves.toBe('handled');

    expect(queue.deadLetters(), 'it worked on the last delivery it had').toHaveLength(0);
    expect(queue.depth()).toBe(0);
  });
});
