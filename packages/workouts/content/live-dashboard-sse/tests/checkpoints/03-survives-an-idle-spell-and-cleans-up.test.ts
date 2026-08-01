import type { Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ReadingFeed } from '../../src/server/readings';
import { type Harness, pause, serve, type Stream, until } from '../support/sse';

/** Short enough that an idle spell costs the suite nothing to sit through. */
const KEEP_ALIVE = 25;

let feed: ReadingFeed;
let app: Express;
let harness: Harness;
let stream: Stream;

beforeEach(async () => {
  feed = new ReadingFeed();
  app = createApp(feed, { keepAliveMs: KEEP_ALIVE });
  harness = await serve(app);
});

afterEach(async () => {
  stream.disconnect();
  await harness.stop();
});

async function connect(): Promise<Stream> {
  stream = harness.open();
  await until(() => feed.subscriberCount > 0, 'the endpoint never subscribed to the meter');
  return stream;
}

describe('the stream survives an idle spell and cleans up after itself', () => {
  it('sends a comment while there is nothing to report', async () => {
    await connect();

    await until(
      () => stream.comments.length >= 2,
      'nothing was written during the idle spell, so the first proxy in the way closes this'
    );
  });

  it('keeps the keep-alive out of the events', async () => {
    await connect();
    await until(() => stream.comments.length >= 2, 'no keep-alive arrived');

    expect(
      stream.frames.length,
      'a keep-alive is a comment; sent as data it becomes a reading the dashboard has to ignore'
    ).toBe(0);
  });

  it('lets go of the meter when the client disconnects', async () => {
    await connect();
    stream.disconnect();
    await until(() => app.locals.disconnects === 1, 'the server never noticed the client leave');

    await until(
      () => feed.subscriberCount === 0,
      'the handler is still subscribed to a response nobody is reading'
    );
  });

  it('stops writing once the client has gone', async () => {
    await connect();
    stream.disconnect();
    await until(() => app.locals.disconnects === 1, 'the server never noticed the client leave');

    feed.publish('web-1', 41);
    // Several keep-alive periods: an interval nobody cleared fires all of them.
    await pause(KEEP_ALIVE * 6);

    expect(
      app.locals.writesAfterClose,
      'something is still writing to a dead connection: a timer, a subscription, or both'
    ).toBe(0);
  });
});
