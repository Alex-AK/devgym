import type { Clock } from './clock';
import type { FakeQueue, QueueMessage } from './queue';

/** What one turn of the worker did. */
export type RunOutcome = 'idle' | 'handled' | 'failed' | 'dead-lettered';

export interface ConsumerOptions {
  /** How many deliveries a job gets before it stops being this queue's problem. */
  maxReceiveCount: number;
  /** How often to tell the queue you are still working on the job you have. */
  heartbeatMs: number;
}

export type JobHandler<T> = (body: T, message: QueueMessage<T>) => Promise<void>;

/**
 * Right now every job counts as finished the moment it arrives: the queue is
 * told before the handler has run, so nothing the handler does after that
 * changes anything.
 *
 * TODO: a job whose handler does not finish has to still be on the queue
 * afterwards; a job that runs for longer than the visibility timeout must not be
 * handed to a second worker while it is running; and a job that has used up its
 * deliveries belongs in the dead-letter store rather than back in the queue.
 * See brief.md.
 */
export class Consumer<T> {
  constructor(
    private readonly queue: FakeQueue<T>,
    private readonly handler: JobHandler<T>,
    private readonly options: ConsumerOptions,
    private readonly clock: Clock
  ) {
    void this.options;
    void this.clock;
  }

  /** Take one job and see it through. */
  async runOnce(): Promise<RunOutcome> {
    const message = this.queue.receive();
    if (!message) return 'idle';

    this.queue.ack(message.receipt);
    await this.handler(message.body, message);
    return 'handled';
  }
}
