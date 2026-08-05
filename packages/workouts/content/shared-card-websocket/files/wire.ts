/**
 * A WebSocket, both ends of it, as two objects instead of a socket.
 *
 * There were two ways to check this workout: run a real `ws` server and open
 * real connections to it, or hand each end of one connection to whoever needs
 * it. This is the second, for the same reason another workout in this library
 * fakes Redis rather than running one, and for one that matters more here. The
 * whole exercise is what happens when two edits made at the same moment reach
 * the room in a particular order. Over a real socket that order belongs to the
 * kernel, so the checkpoint could not choose it and the workout would be flaky
 * in the one place it has to be exact.
 *
 * What is kept is what the exercise is about: two ends that both write, in
 * order, and a `send` into a connection that has gone doing nothing at all. What
 * is dropped is the handshake, the framing and the network, none of which this
 * is about. `moving-data/websockets` in the handbook is where those live.
 */

/** The room's end of one connection. `ws` calls this a WebSocket too. */
export interface Connection {
  /** Names the client. Handy in a log; the room does not need it. */
  readonly id: string;
  readonly closed: boolean;
  /** Set by the room. Called with the raw text the client sent. */
  onmessage: ((data: string) => void) | null;
  /** Set by the room. Called once, when this connection has gone. */
  onclose: (() => void) | null;
  send(data: string): void;
  close(): void;
}

/** The browser's end of the same connection. */
export interface ClientSocket {
  readonly closed: boolean;
  /** Set by the component. Called with the raw text the room sent. */
  onmessage: ((data: string) => void) | null;
  send(data: string): void;
  close(): void;
}

export interface Wire {
  server: Connection;
  client: ClientSocket;
  /**
   * Sends into this connection after it closed. The browser discards those
   * without a word and nothing counts them, which is why this is here: it is the
   * only way a checkpoint can see a write that should not have been made.
   */
  readonly discarded: number;
}

/** One connection, and the two ends of it. */
export function openWire(id: string): Wire {
  let closed = false;
  let discarded = 0;

  const drop = (): void => {
    if (closed) return;
    closed = true;
    server.onclose?.();
  };

  const server: Connection = {
    id,
    get closed() {
      return closed;
    },
    onmessage: null,
    onclose: null,
    send(data: string): void {
      if (closed) {
        discarded += 1;
        return;
      }
      client.onmessage?.(data);
    },
    close: drop,
  };

  const client: ClientSocket = {
    get closed() {
      return closed;
    },
    onmessage: null,
    send(data: string): void {
      if (closed) {
        discarded += 1;
        return;
      }
      server.onmessage?.(data);
    },
    close: drop,
  };

  return {
    server,
    client,
    get discarded() {
      return discarded;
    },
  };
}
