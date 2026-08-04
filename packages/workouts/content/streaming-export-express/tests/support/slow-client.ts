import { Agent, createServer, type IncomingHttpHeaders, request } from 'node:http';
import { Duplex } from 'node:stream';

import type { Express } from 'express';

/**
 * The client that reads slowly, and the wire it reads over.
 *
 * There is no network here and no port: a pair of in-memory duplexes stands in
 * for the socket, and the HTTP server is handed one of them as a connection.
 * That is deliberate. A loopback socket hides this exercise behind the kernel,
 * which will absorb megabytes of a response nobody is reading and hand it back
 * later; these two ends buffer only what the code under test hands them, so the
 * bytes queued in the response are exactly the bytes the handler queued.
 *
 * The reading end takes `bytesPerTick` bytes every `tickMs` and not one byte
 * more, which is what a phone on a train does to an export endpoint.
 */

export interface Delivered {
  status: number;
  headers: IncomingHttpHeaders;
  body: string;
  /** Bytes of body actually delivered, which is the file size, not the wire size. */
  bytes: number;
}

export interface SlowClientOptions {
  /** Bytes the client will accept per tick. Default 32 KiB. */
  bytesPerTick?: number;
  /** How often it takes them. Default every 4ms. */
  tickMs?: number;
  /** Give up if nothing new arrives for this long. Default 2000ms. */
  stallMs?: number;
}

/**
 * One end of the wire. A write goes straight into the other end's read buffer,
 * and its callback is held until that end is actually read, which is what makes
 * a slow reader felt by the writer rather than smoothed over.
 */
class WireEnd extends Duplex {
  other!: WireEnd;
  private waiting: (() => void) | null = null;

  constructor() {
    // What a real net.Socket starts with, so `write()` turns false in the same
    // place here as it does in production.
    super({ readableHighWaterMark: 65536, writableHighWaterMark: 65536 });
  }

  // The http server and client call these on whatever they are given.
  setTimeout(): this {
    return this;
  }
  setNoDelay(): this {
    return this;
  }
  setKeepAlive(): this {
    return this;
  }
  ref(): this {
    return this;
  }
  unref(): this {
    return this;
  }
  destroySoon(): void {
    this.end();
  }

  override _read(): void {
    const waiting = this.waiting;
    if (waiting) {
      this.waiting = null;
      waiting();
    }
  }

  override _write(chunk: Buffer, _encoding: string, done: () => void): void {
    if (chunk.length === 0) {
      process.nextTick(done);
      return;
    }
    this.other.push(chunk);
    this.other.waiting = done;
  }

  override _final(done: () => void): void {
    this.other.push(null);
    done();
  }
}

function wire(): { client: WireEnd; server: WireEnd } {
  const client = new WireEnd();
  const server = new WireEnd();
  client.other = server;
  server.other = client;
  return { client, server };
}

/** Fetch `path` from `app` with a client that reads at a fixed, unhurried rate. */
export function download(
  app: Express,
  path: string,
  options: SlowClientOptions = {}
): Promise<Delivered> {
  const bytesPerTick = options.bytesPerTick ?? 32768;
  const tickMs = options.tickMs ?? 4;
  const stallMs = options.stallMs ?? 2000;

  const server = createServer(app);
  const ends = wire();
  server.emit('connection', ends.server);

  const agent = new Agent({ keepAlive: false });
  agent.createConnection = () => ends.client;

  return new Promise<Delivered>((resolve, reject) => {
    const outgoing = request({ agent, host: 'localhost', method: 'GET', path }, (incoming) => {
      const parts: Buffer[] = [];
      let bytes = 0;
      let lastByteAt = Date.now();
      let timer: NodeJS.Timeout | null = null;

      let settled = false;
      const stop = (): void => {
        settled = true;
        if (timer) clearInterval(timer);
        ends.client.destroy();
        ends.server.destroy();
        server.close();
      };

      const finish = (): void => {
        if (settled) return;
        stop();
        resolve({
          status: incoming.statusCode ?? 0,
          headers: incoming.headers,
          body: Buffer.concat(parts).toString('utf8'),
          bytes,
        });
      };

      const give = (why: string): void => {
        if (settled) return;
        stop();
        reject(new Error(why));
      };

      incoming.on('end', finish);
      incoming.on('error', (error) => {
        give(error.message);
      });

      incoming.pause();
      timer = setInterval(() => {
        let taken = 0;
        while (taken < bytesPerTick) {
          // read(n) hands back null unless n bytes are already sitting there, so
          // asking for exactly what has arrived is what keeps a trickle
          // readable. With nothing buffered, the argument-less read is what
          // makes the stream notice it has ended.
          const wanted = Math.min(bytesPerTick - taken, incoming.readableLength);
          const chunk = incoming.read(wanted > 0 ? wanted : undefined) as Buffer | null;
          if (chunk === null) break;
          taken += chunk.length;
          bytes += chunk.length;
          parts.push(chunk);
        }
        if (taken > 0) lastByteAt = Date.now();

        if (incoming.readableEnded) finish();
        else if (Date.now() - lastByteAt > stallMs) {
          // A handler waiting for a drain that is never coming ends up here.
          give(
            `the response stopped after ${bytes} bytes and never ended: ` +
              `nothing more arrived for ${stallMs}ms`
          );
        }
      }, tickMs);
    });

    outgoing.on('error', reject);
    outgoing.end();
  });
}
