import { beforeEach, describe, expect, it } from 'vitest';

import { Clock } from '../../src/lib/clock';
import { Consumer } from '../../src/lib/consumer';
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

describe('an unfinished job comes back', () => {
  it('leaves a job the handler threw on where it was', async () => {
    queue.send({ documentId: 'doc-1' });
    const consumer = new Consumer<Job>(
      queue,
      () => Promise.reject(new Error('the converter said no')),
      OPTIONS,
      clock
    );

    await expect(consumer.runOnce()).resolves.toBe('failed');

    expect(queue.depth(), 'a job that failed must not have been acked').toBe(1);
    expect(queue.deadLetters(), 'one failure is not the end of the road').toHaveLength(0);
    expect(queue.inFlight(), 'the job should still be hidden until its deadline').toHaveLength(1);
  });

  it('gets it again once the visibility timeout has passed', async () => {
    queue.send({ documentId: 'doc-1' });
    const deliveries: number[] = [];
    let failing = true;
    const consumer = new Consumer<Job>(
      queue,
      async (_body, message) => {
        deliveries.push(message.receiveCount);
        if (failing) {
          failing = false;
          throw new Error('the converter said no');
        }
      },
      OPTIONS,
      clock
    );

    await expect(consumer.runOnce()).resolves.toBe('failed');
    await expect(consumer.runOnce(), 'the job is hidden until its deadline').resolves.toBe('idle');

    await clock.advance(VISIBILITY_MS);
    await expect(consumer.runOnce()).resolves.toBe('handled');

    expect(deliveries, 'the same job, delivered a second time').toEqual([1, 2]);
    expect(queue.depth()).toBe(0);
  });

  it('keeps the job when the worker dies between the work and the ack', async () => {
    queue.send({ documentId: 'doc-1' });
    const converted: string[] = [];
    const consumer = new Consumer<Job>(
      queue,
      async (body) => {
        converted.push(body.documentId);
      },
      OPTIONS,
      clock
    );

    // The work lands and the ack never does, which is the case the queue cannot
    // tell apart from the work never happening.
    queue.failNextAck();
    await consumer.runOnce().catch(() => undefined);

    expect(converted, 'the work itself happened').toEqual(['doc-1']);
    expect(queue.depth(), 'nothing told the queue, so it should still have the job').toBe(1);
    expect(queue.deadLetters()).toHaveLength(0);

    await clock.advance(VISIBILITY_MS);
    await expect(consumer.runOnce()).resolves.toBe('handled');

    expect(
      converted,
      'the redelivery converts it again: nothing was lost, and that is what it cost'
    ).toEqual(['doc-1', 'doc-1']);
    expect(queue.depth()).toBe(0);
  });
});
