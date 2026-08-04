import type { Clock } from './clock';

export interface QueueOptions {
  /** How long a delivered job is hidden from everybody else. */
  visibilityTimeoutMs: number;
}

/** One delivery of one job. */
export interface QueueMessage<T> {
  /** The job. The same id comes back on every redelivery of it. */
  readonly id: string;
  /** This delivery. A redelivery mints a new one, and this one stops working. */
  readonly receipt: string;
  readonly body: T;
  /** 1 on the first delivery, 2 on the first redelivery, and so on. */
  readonly receiveCount: number;
}

export interface DeadLetter<T> {
  readonly id: string;
  readonly body: T;
  readonly receiveCount: number;
  readonly reason: string;
}

interface Entry<T> {
  id: string;
  body: T;
  sentAt: number;
  receiveCount: number;
  /** The current delivery, or null before the first one. */
  receipt: string | null;
  /** The clock reading at which this job goes back into the queue. */
  visibleAt: number;
}

/**
 * A queue in one file, with the awkward parts kept. Given to you, and not part
 * of the exercise.
 *
 * `receive` hides a job for `visibilityTimeoutMs` rather than removing it. Until
 * that deadline nobody else can have it; past it the job is back in the queue
 * with `receiveCount` one higher, whether or not whoever took it is still
 * working. The queue does not care why it heard nothing, and it will do that
 * forever: nothing here dead-letters on its own.
 *
 * A receipt is good only for the delivery it came with. Once that delivery has
 * been superseded, `ack`, `extend` and `deadLetter` do nothing at all, silently.
 *
 * Nothing moves on its own either. A job comes back because the clock passed its
 * deadline, and a job leaves because somebody acked or dead-lettered it.
 */
export class FakeQueue<T> {
  private entries: Entry<T>[] = [];
  private dead: DeadLetter<T>[] = [];
  private nextJob = 1;
  private nextReceipt = 1;
  private ackDies = false;

  constructor(
    private readonly options: QueueOptions,
    private readonly clock: Clock
  ) {}

  get visibilityTimeoutMs(): number {
    return this.options.visibilityTimeoutMs;
  }

  /** Put a job on the queue. Answers its id. */
  send(body: T): string {
    const id = `job-${this.nextJob}`;
    this.nextJob += 1;
    this.entries.push({
      id,
      body,
      sentAt: this.clock.now(),
      receiveCount: 0,
      receipt: null,
      visibleAt: 0,
    });
    return id;
  }

  /**
   * Take the oldest visible job and hide it for `visibilityTimeoutMs`.
   * `undefined` when nothing is visible right now.
   */
  receive(): QueueMessage<T> | undefined {
    const now = this.clock.now();
    const entry = this.entries
      .filter((candidate) => candidate.visibleAt <= now)
      .sort((a, b) => a.sentAt - b.sentAt)[0];
    if (!entry) return undefined;

    entry.receiveCount += 1;
    entry.receipt = `receipt-${this.nextReceipt}`;
    entry.visibleAt = now + this.visibilityTimeoutMs;
    this.nextReceipt += 1;

    return {
      id: entry.id,
      receipt: entry.receipt,
      body: entry.body,
      receiveCount: entry.receiveCount,
    };
  }

  /** The job is done and leaves the queue. A superseded receipt does nothing. */
  ack(receipt: string): void {
    if (this.ackDies) {
      this.ackDies = false;
      throw new Error('the process died before the ack reached the queue');
    }
    this.entries = this.entries.filter((entry) => entry.receipt !== receipt);
  }

  /** Move the job's deadline to `ms` from now. A superseded receipt does nothing. */
  extend(receipt: string, ms: number): void {
    const entry = this.find(receipt);
    if (!entry) return;
    entry.visibleAt = this.clock.now() + ms;
  }

  /** Take the job off the queue for good, keeping why. A superseded receipt does nothing. */
  deadLetter(receipt: string, reason: string): void {
    const entry = this.find(receipt);
    if (!entry) return;
    this.entries = this.entries.filter((candidate) => candidate !== entry);
    this.dead.push({
      id: entry.id,
      body: entry.body,
      receiveCount: entry.receiveCount,
      reason,
    });
  }

  /** Everything that has been dead-lettered, oldest first. */
  deadLetters(): DeadLetter<T>[] {
    return [...this.dead];
  }

  /** Test-only. Jobs still on the queue, visible or hidden. */
  depth(): number {
    return this.entries.length;
  }

  /** Test-only. Jobs a live visibility timeout is hiding right now. */
  inFlight(): { id: string; receiveCount: number }[] {
    const now = this.clock.now();
    return this.entries
      .filter((entry) => entry.visibleAt > now)
      .map((entry) => ({ id: entry.id, receiveCount: entry.receiveCount }));
  }

  /** Test-only. The next `ack` throws instead of landing. */
  failNextAck(): void {
    this.ackDies = true;
  }

  private find(receipt: string): Entry<T> | undefined {
    return this.entries.find((entry) => entry.receipt === receipt);
  }
}
