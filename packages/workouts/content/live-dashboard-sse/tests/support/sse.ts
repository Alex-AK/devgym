import { type ClientRequest, get, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

import type { Express } from 'express';

/**
 * What the checkpoints use instead of a browser: a real connection to the app
 * on a loopback port, and a parser for what comes back down it.
 *
 * Nothing here waits on a clock. A reading exists because a checkpoint
 * published it, and a disconnection happens because a checkpoint asked for one,
 * so the only waiting is waiting for delivery.
 */

export interface Frame {
  id: string | null;
  name: string;
  data: string;
}

export class Stream {
  readonly frames: Frame[] = [];
  readonly comments: string[] = [];
  headers: IncomingHttpHeaders = {};
  status = 0;
  /** True once the response headers have arrived, which is not the same as data. */
  responded = false;
  ended = false;
  text = '';

  private buffer = '';
  private readonly request: ClientRequest;

  constructor(port: number, headers: Record<string, string> = {}) {
    this.request = get({ host: '127.0.0.1', port, path: '/events', headers });

    this.request.on('response', (response) => {
      this.responded = true;
      this.status = response.statusCode ?? 0;
      this.headers = response.headers;
      response.setEncoding('utf8');
      response.on('data', (chunk: string) => this.absorb(chunk));
      response.on('end', () => {
        this.ended = true;
      });
    });

    // Destroying our own socket is how a checkpoint plays "the client went
    // away", so the error that follows is the expected outcome.
    this.request.on('error', () => {});
  }

  /** The client goes away, the way a closed tab does. */
  disconnect(): void {
    this.request.destroy();
  }

  private absorb(chunk: string): void {
    const text = chunk.replace(/\r\n/g, '\n');
    this.text += text;
    this.buffer += text;

    // A blank line ends a block, which is the whole of the framing.
    let end = this.buffer.indexOf('\n\n');
    while (end !== -1) {
      this.parse(this.buffer.slice(0, end));
      this.buffer = this.buffer.slice(end + 2);
      end = this.buffer.indexOf('\n\n');
    }
  }

  private parse(block: string): void {
    let id: string | null = null;
    let name = 'message';
    const data: string[] = [];

    for (const line of block.split('\n')) {
      if (line.startsWith(':')) this.comments.push(line.slice(1).trim());
      else if (line.startsWith('data:')) data.push(line.slice(5).trim());
      else if (line.startsWith('id:')) id = line.slice(3).trim();
      else if (line.startsWith('event:')) name = line.slice(6).trim();
    }

    // A block with no data dispatches nothing. That is what a keep-alive is.
    if (data.length > 0) this.frames.push({ id, name, data: data.join('\n') });
  }
}

export class Harness {
  constructor(
    private readonly server: Server,
    readonly port: number
  ) {}

  open(headers?: Record<string, string>): Stream {
    return new Stream(this.port, headers);
  }

  async stop(): Promise<void> {
    this.server.closeAllConnections();
    await new Promise<void>((resolve) => this.server.close(() => resolve()));
  }
}

export function serve(app: Express): Promise<Harness> {
  return new Promise((resolve) => {
    const server = app.listen(0, '127.0.0.1', () => {
      resolve(new Harness(server, (server.address() as AddressInfo).port));
    });
  });
}

/** Wait for something a checkpoint already caused. A timeout means it never happened. */
export async function until(condition: () => boolean, complaint: string): Promise<void> {
  const deadline = Date.now() + 1500;
  while (Date.now() < deadline) {
    if (condition()) return;
    await pause(5);
  }
  throw new Error(complaint);
}

export function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
