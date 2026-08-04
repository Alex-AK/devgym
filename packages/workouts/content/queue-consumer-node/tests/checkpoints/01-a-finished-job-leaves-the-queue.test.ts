import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Clock } from '../../src/lib/clock';
import { Consumer } from '../../src/lib/consumer';
import { FakeQueue } from '../../src/lib/queue';
import { deferred, tick } from '../support/deferred';

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

describe('a finished job leaves the queue', () => {
  it('does nothing when there is nothing to do', async () => {
    const handler = vi.fn(async () => {});
    const consumer = new Consumer<Job>(queue, handler, OPTIONS, clock);

    await expect(consumer.runOnce()).resolves.toBe('idle');
    expect(handler).not.toHaveBeenCalled();
  });

  it('hands the handler the job that was sent', async () => {
    queue.send({ documentId: 'doc-1' });
    const seen: Job[] = [];
    const consumer = new Consumer<Job>(
      queue,
      async (body) => {
        seen.push(body);
      },
      OPTIONS,
      clock
    );

    await expect(consumer.runOnce()).resolves.toBe('handled');

    expect(seen).toEqual([{ documentId: 'doc-1' }]);
  });

  it('keeps the job while the work is still going, and drops it once it is done', async () => {
    queue.send({ documentId: 'doc-1' });
    const work = deferred<void>();
    const consumer = new Consumer<Job>(queue, () => work.promise, OPTIONS, clock);

    const run = consumer.runOnce();
    await tick();

    expect(queue.depth(), 'the job left the queue before the handler had finished it').toBe(1);
    expect(queue.inFlight()).toHaveLength(1);

    work.resolve();
    await expect(run).resolves.toBe('handled');

    expect(queue.depth(), 'the job is done, so it should be off the queue').toBe(0);
    expect(queue.deadLetters()).toHaveLength(0);
  });

  it('takes one job per run', async () => {
    queue.send({ documentId: 'doc-1' });
    queue.send({ documentId: 'doc-2' });
    const handler = vi.fn(async () => {});
    const consumer = new Consumer<Job>(queue, handler, OPTIONS, clock);

    await expect(consumer.runOnce()).resolves.toBe('handled');
    expect(handler).toHaveBeenCalledTimes(1);
    expect(queue.depth()).toBe(1);

    await expect(consumer.runOnce()).resolves.toBe('handled');
    expect(handler).toHaveBeenCalledTimes(2);
    expect(queue.depth()).toBe(0);
  });
});
