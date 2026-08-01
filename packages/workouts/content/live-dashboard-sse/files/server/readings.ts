export interface Reading {
  /** Monotonic, and what a reconnecting client resumes from. */
  id: number;
  host: string;
  cpu: number;
}

type Listener = (reading: Reading) => void;

/** How many readings are kept for replay. Every buffer has an end. */
const HISTORY = 50;

/**
 * The meter the dashboard is watching. Something on the machines calls
 * `publish` in production; here the checkpoints call it, which is what lets a
 * stream be tested without waiting on a clock.
 */
export class ReadingFeed {
  private readonly listeners = new Set<Listener>();
  private readonly history: Reading[] = [];
  private nextId = 1;

  publish(host: string, cpu: number): Reading {
    const reading: Reading = { id: this.nextId, host, cpu };
    this.nextId += 1;

    this.history.push(reading);
    if (this.history.length > HISTORY) this.history.shift();

    for (const listener of this.listeners) listener(reading);
    return reading;
  }

  /** Hands back the undo. Nothing else will remove the listener for you. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Everything published after `id`, oldest first, as far back as the buffer goes. */
  since(id: number): Reading[] {
    return this.history.filter((reading) => reading.id > id);
  }

  get subscriberCount(): number {
    return this.listeners.size;
  }
}
