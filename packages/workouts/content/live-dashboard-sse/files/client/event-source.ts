/**
 * An `EventSource`, because jsdom does not ship one.
 *
 * There were two ways to check the browser half of this workout: point the
 * component at a real socket, or hand it an EventSource whose events are
 * function calls. This is the second, for the same reason another workout in
 * this library fakes Redis rather than running one. A dropped connection has to
 * be something a checkpoint causes on demand, and the component's job here is
 * what it does about the drop, not how the bytes were framed. Framing is the
 * server half, and it is checked over a real socket there.
 *
 * The surface is the browser's: `readyState`, `onopen`/`onmessage`/`onerror`,
 * `addEventListener`, and `close`. Dashboard.tsx is written exactly as it would
 * be against the real thing, apart from the import.
 *
 * One deliberate difference. A real EventSource waits and reconnects on its
 * own; here `stream.restore()` does it, so nothing in a checkpoint depends on a
 * timer. What survives the drop is the part that matters: the reconnection
 * carries the last id the client saw, which is what the endpoint replays from.
 */

export interface Connection {
  url: string;
  /** The id this connection asked to resume from, or null on a first attempt. */
  lastEventId: string | null;
  state: 'connecting' | 'open' | 'dropped' | 'closed';
}

export interface StreamEvent {
  /** The payload, as text. SSE has no other kind. */
  data: string;
  id?: string;
  /** Defaults to "message", which is what an event with no name arrives as. */
  event?: string;
}

/** Every connection the page has opened, oldest first. The checkpoints read this. */
export const connections: Connection[] = [];

const sources = new Set<EventSource>();

type Handler = ((event: MessageEvent) => void) | null;

export class EventSource extends EventTarget {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 2;

  readonly CONNECTING = 0;
  readonly OPEN = 1;
  readonly CLOSED = 2;

  readonly url: string;
  readyState = 0;

  private connection: Connection | null = null;
  private seenId: string | null = null;
  private readonly handlers: Record<string, Handler> = { open: null, message: null, error: null };

  constructor(url: string) {
    super();
    this.url = url;
    sources.add(this);
    this.open();
  }

  get onopen(): Handler {
    return this.handlers.open ?? null;
  }

  set onopen(handler: Handler) {
    this.replace('open', handler);
  }

  get onmessage(): Handler {
    return this.handlers.message ?? null;
  }

  set onmessage(handler: Handler) {
    this.replace('message', handler);
  }

  get onerror(): Handler {
    return this.handlers.error ?? null;
  }

  set onerror(handler: Handler) {
    this.replace('error', handler);
  }

  /** Give up for good. A closed EventSource never reconnects. */
  close(): void {
    this.readyState = this.CLOSED;
    if (this.connection && this.connection.state !== 'dropped') this.connection.state = 'closed';
    sources.delete(this);
  }

  /* --------------------------------------------------- driven by `stream` */

  /** @internal */
  deliver(event: StreamEvent): void {
    if (this.readyState !== this.OPEN) return;
    if (event.id !== undefined) this.seenId = event.id;

    this.dispatchEvent(
      new MessageEvent(event.event ?? 'message', {
        data: event.data,
        lastEventId: this.seenId ?? '',
      })
    );
  }

  /** @internal */
  drop(): void {
    if (this.readyState === this.CLOSED) return;
    if (this.connection) this.connection.state = 'dropped';
    this.readyState = this.CONNECTING;
    this.dispatchEvent(new Event('error'));
  }

  /** @internal */
  open(): void {
    if (this.readyState === this.CLOSED) return;

    const connection: Connection = {
      url: this.url,
      lastEventId: this.seenId,
      state: 'connecting',
    };
    this.connection = connection;
    connections.push(connection);

    // No connection is ever open in the tick that asked for it, so a listener
    // added after the constructor still hears about it.
    queueMicrotask(() => {
      if (this.connection !== connection || this.readyState === this.CLOSED) return;
      this.readyState = this.OPEN;
      connection.state = 'open';
      this.dispatchEvent(new Event('open'));
    });
  }

  private replace(type: string, handler: Handler): void {
    const current = this.handlers[type];
    if (current) this.removeEventListener(type, current as EventListener);
    this.handlers[type] = handler;
    if (handler) this.addEventListener(type, handler as EventListener);
  }
}

/**
 * The other end of the wire, as a set of function calls. Real code has none of
 * this; it is here so a checkpoint can decide exactly when an event arrives and
 * exactly when the connection dies.
 */
export const stream = {
  reset(): void {
    for (const source of [...sources]) source.close();
    sources.clear();
    connections.length = 0;
  },

  /** The connection the page is listening on right now, if there is one. */
  current(): Connection | undefined {
    return [...connections].reverse().find((connection) => connection.state === 'open');
  },

  /** Push one event down whatever is open. */
  send(event: StreamEvent): void {
    for (const source of sources) source.deliver(event);
  },

  /** The connection dies, the way a proxy or a tunnel kills one. */
  drop(): void {
    for (const source of [...sources]) source.drop();
  },

  /** The browser's automatic reconnection, on demand rather than on a timer. */
  restore(): void {
    for (const source of [...sources]) {
      if (source.readyState === EventSource.CONNECTING) source.open();
    }
  },
};
