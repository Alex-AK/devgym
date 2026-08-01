import express, { type Express, type RequestHandler } from 'express';

import type { ReadingFeed } from './readings';
import { createStream, type StreamOptions } from './stream';

/**
 * The service. One endpoint, and the meter it reports on. This file is wiring;
 * the work is in stream.ts.
 */
export function createApp(feed: ReadingFeed, options: StreamOptions): Express {
  const app = express();

  /** How many clients have gone away. A checkpoint waits on this. */
  app.locals.disconnects = 0;
  /** Writes to a response whose client had already gone. Should stay at zero. */
  app.locals.writesAfterClose = 0;

  app.get('/events', watchForLateWrites(app), createStream(feed, options));

  return app;
}

/** `res.write`, minus the overloads, which is all this needs to stand in for. */
type Write = (chunk: unknown, ...rest: unknown[]) => boolean;

/**
 * Instrumentation, and nothing a real service would carry. Once the socket is
 * gone node quietly discards whatever you write to it, so an interval that
 * outlived its connection is invisible until the process runs out of handles.
 * Counting the writes makes the leak something a checkpoint can see.
 */
function watchForLateWrites(app: Express): RequestHandler {
  return (req, res, next) => {
    const original = res.write.bind(res) as Write;
    let gone = false;

    req.on('close', () => {
      gone = true;
      app.locals.disconnects += 1;
    });
    // A write can lose the race with the socket closing, and node raises that
    // here. It is noise, not the thing being practised.
    res.on('error', () => {});

    (res as unknown as { write: Write }).write = (chunk, ...rest) => {
      if (gone) {
        app.locals.writesAfterClose += 1;
        return true;
      }
      try {
        return original(chunk, ...rest);
      } catch {
        return false;
      }
    };

    next();
  };
}
