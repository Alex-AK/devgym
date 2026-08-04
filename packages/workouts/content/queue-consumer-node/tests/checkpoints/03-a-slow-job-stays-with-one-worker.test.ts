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

describe('a slow job stays with one worker', () => {
  it('keeps the job hidden for as long as the handler runs', async () => {
    queue.send({ documentId: 'doc-1' });
    const work = deferred<void>();
    const handler = vi.fn(() => work.promise);
    const extend = vi.spyOn(queue, 'extend');
    const consumer = new Consumer<Job>(queue, handler, OPTIONS, clock);

    const run = consumer.runOnce();
    await tick();
    // Three times the visibility timeout, and the job is still being converted.
    await clock.advance(VISIBILITY_MS * 3);

    expect(
      handler,
      'the job is still being worked on, so it must not start again'
    ).toHaveBeenCalledTimes(1);
    expect(extend, 'nothing told the queue the work was still going').toHaveBeenCalled();
    expect(queue.inFlight(), 'the deadline expired under a job that is still running').toHaveLength(
      1
    );
    expect(queue.receive(), 'a second worker was able to take the job').toBeUndefined();

    work.resolve();
    await expect(run).resolves.toBe('handled');
    expect(queue.depth()).toBe(0);
  });

  it('stops telling the queue anything once the work is done', async () => {
    queue.send({ documentId: 'doc-1' });
    const consumer = new Consumer<Job>(queue, async () => {}, OPTIONS, clock);

    await expect(consumer.runOnce()).resolves.toBe('handled');

    const extend = vi.spyOn(queue, 'extend');
    await clock.advance(VISIBILITY_MS * 3);

    expect(extend, 'the heartbeat outlived the job it was for').not.toHaveBeenCalled();
  });
});
