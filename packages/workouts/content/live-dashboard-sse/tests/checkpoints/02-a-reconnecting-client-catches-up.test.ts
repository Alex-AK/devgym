import type { Express } from 'express';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ReadingFeed } from '../../src/server/readings';
import { type Harness, serve, type Stream, until } from '../support/sse';

const KEEP_ALIVE = 60_000;

let feed: ReadingFeed;
let app: Express;
let harness: Harness;
const open: Stream[] = [];

beforeEach(async () => {
  feed = new ReadingFeed();
  open.length = 0;
  app = createApp(feed, { keepAliveMs: KEEP_ALIVE });
  harness = await serve(app);
});

afterEach(async () => {
  for (const stream of open) stream.disconnect();
  await harness.stop();
});

/**
 * Open a connection and wait until the endpoint has picked it up. Waiting on
 * the subscriber count rather than on bytes keeps this checkpoint about
 * resumption: a stream that never framed anything fails the first checkpoint,
 * not this one.
 */
async function connect(headers?: Record<string, string>): Promise<Stream> {
  const before = feed.subscriberCount;
  const stream = harness.open(headers);
  open.push(stream);
  await until(() => feed.subscriberCount > before, 'the endpoint never subscribed to the meter');
  return stream;
}

/** Leave, and wait until the server has noticed, so the next connection is a reconnection. */
async function goAway(stream: Stream): Promise<void> {
  const before = app.locals.disconnects as number;
  stream.disconnect();
  await until(
    () => (app.locals.disconnects as number) > before,
    'the server never noticed the client leave'
  );
}

describe('a reconnecting client gets what it missed', () => {
  it('puts an id on every event', async () => {
    const stream = await connect();
    feed.publish('web-1', 41);
    feed.publish('web-1', 44);

    await until(() => stream.frames.length >= 2, 'no events arrived');
    expect(
      stream.frames.map((frame) => frame.id),
      'with no id there is nothing for a client to resume from'
    ).toEqual(['1', '2']);
  });

  it('replays the events that landed while the client was away', async () => {
    const first = await connect();
    feed.publish('web-1', 41);
    feed.publish('web-1', 44);
    await until(() => first.frames.length >= 2, 'no events arrived on the first connection');

    await goAway(first);
    feed.publish('web-1', 60);
    feed.publish('db-1', 12);

    const second = await connect({ 'Last-Event-ID': '2' });
    await until(
      () => second.frames.length >= 2,
      'the client came back holding id 2 and was told nothing about 3 and 4'
    );

    expect(second.frames.slice(0, 2).map((frame) => frame.id)).toEqual(['3', '4']);
    expect(JSON.parse(second.frames[1]?.data ?? 'null')).toEqual({ id: 4, host: 'db-1', cpu: 12 });
  });

  it('does not send back what the client already had', async () => {
    const first = await connect();
    feed.publish('web-1', 41);
    feed.publish('web-1', 44);
    await until(() => first.frames.length >= 2, 'no events arrived on the first connection');
    await goAway(first);

    feed.publish('web-1', 60);
    const second = await connect({ 'Last-Event-ID': '2' });
    await until(() => second.frames.length >= 1, 'nothing was replayed');

    expect(
      second.frames.every((frame) => Number(frame.id) > 2),
      'the whole buffer came back, so the dashboard counts the first two readings twice'
    ).toBe(true);
  });

  it('starts a first-time client at the present', async () => {
    feed.publish('web-1', 41);
    feed.publish('web-1', 44);

    const fresh = await connect();
    feed.publish('db-1', 12);
    await until(() => fresh.frames.length >= 1, 'a live reading never arrived');

    expect(
      fresh.frames.map((frame) => frame.id),
      'no Last-Event-ID means a new client, not a client resuming from zero'
    ).toEqual(['3']);
  });

  it('treats a Last-Event-ID it cannot read as a first connection', async () => {
    feed.publish('web-1', 41);

    const odd = await connect({ 'Last-Event-ID': 'not-an-id' });
    feed.publish('db-1', 12);
    await until(
      () => odd.frames.length >= 1,
      'a header the client made up took the stream down with it'
    );

    expect(odd.frames.map((frame) => frame.id)).toEqual(['2']);
  });
});
