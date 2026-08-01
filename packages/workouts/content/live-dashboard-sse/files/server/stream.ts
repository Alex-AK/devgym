import type { Request, RequestHandler, Response } from 'express';

import type { ReadingFeed } from './readings';

export interface StreamOptions {
  /** How often to send a keep-alive comment, in milliseconds. */
  keepAliveMs: number;
}

/**
 * `GET /events`, the dashboard's feed.
 *
 * It subscribes to the meter and writes every reading down the open response,
 * which is the right instinct and none of the protocol. Nothing here declares
 * an event stream, nothing frames an event, nothing gives one an id, and
 * nothing lets go when the client does.
 *
 * TODO: make it a real event stream. See brief.md.
 */
export function createStream(feed: ReadingFeed, options: StreamOptions): RequestHandler {
  void options;

  return function stream(_req: Request, res: Response): void {
    res.setHeader('Content-Type', 'application/json');

    feed.subscribe((reading) => {
      res.write(JSON.stringify(reading));
    });
  };
}
