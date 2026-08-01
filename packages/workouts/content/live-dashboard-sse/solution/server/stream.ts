import type { Request, RequestHandler, Response } from 'express';

import type { Reading, ReadingFeed } from './readings';

export interface StreamOptions {
  /** How often to send a keep-alive comment, in milliseconds. */
  keepAliveMs: number;
}

/** One event: the id to resume from, the payload, and the blank line that dispatches it. */
function frame(reading: Reading): string {
  return `id: ${reading.id}\ndata: ${JSON.stringify(reading)}\n\n`;
}

/** The id this client already has, or null when it has never been here. */
function resumeFrom(req: Request): number | null {
  const header = req.header('last-event-id');
  if (header === undefined) return null;

  // The header is whatever the client chose to send. Anything that is not an
  // id gets treated as a first connection rather than as an error.
  const id = Number(header);
  return Number.isInteger(id) && id >= 0 ? id : null;
}

export function createStream(feed: ReadingFeed, options: StreamOptions): RequestHandler {
  return function stream(req: Request, res: Response): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    // Headers wait in a buffer until something sends them, and the first
    // reading could be a minute away. EventSource sits in CONNECTING until it
    // has them, and a proxy has nothing to tell it not to buffer.
    res.flushHeaders();

    const since = resumeFrom(req);
    if (since !== null) {
      for (const missed of feed.since(since)) res.write(frame(missed));
    }

    const unsubscribe = feed.subscribe((reading) => {
      res.write(frame(reading));
    });

    // A line starting with a colon is a comment. It dispatches nothing, and it
    // stops anything in the middle deciding the connection has gone quiet.
    const keepAlive = setInterval(() => {
      res.write(': keep-alive\n\n');
    }, options.keepAliveMs);

    req.on('close', () => {
      unsubscribe();
      clearInterval(keepAlive);
    });
  };
}
