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

export class Consumer<T> {
  constructor(
    private readonly queue: FakeQueue<T>,
    private readonly handler: JobHandler<T>,
    private readonly options: ConsumerOptions,
    private readonly clock: Clock
  ) {}

  async runOnce(): Promise<RunOutcome> {
    const message = this.queue.receive();
    if (!message) return 'idle';

    try {
      await this.workOn(message);
    } catch (error) {
      // This delivery used up the last one the job had, so it goes somewhere a
      // person can find it rather than round again.
      if (message.receiveCount >= this.options.maxReceiveCount) {
        this.queue.deadLetter(message.receipt, describe(error));
        return 'dead-lettered';
      }
      // Leave the message alone. Doing nothing is what makes the redelivery
      // happen, and the redelivery is the whole reason nothing was lost.
      return 'failed';
    }

    // Only now is "this job is done" a true thing to say.
    this.queue.ack(message.receipt);
    return 'handled';
  }

  /**
   * The visibility timeout is a bet on how long the work takes, and a slow job
   * loses it: the queue concludes the worker is dead and hands the job to
   * somebody else while it is still running. Push the deadline out for as long
   * as the handler is going, and stop the moment it settles.
   */
  private async workOn(message: QueueMessage<T>): Promise<void> {
    const work = this.handler(message.body, message);
    let working = true;

    const beat = async (): Promise<void> => {
      while (working) {
        await this.clock.sleep(this.options.heartbeatMs);
        if (!working) return;
        this.queue.extend(message.receipt, this.queue.visibilityTimeoutMs);
      }
    };
    void beat();

    try {
      await work;
    } finally {
      working = false;
    }
  }
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
