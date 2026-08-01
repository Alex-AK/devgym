import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ReadingFeed } from '../../src/server/readings';
import { type Harness, serve, type Stream, until } from '../support/sse';

/** Far past the end of this suite: nothing but readings should turn up here. */
const KEEP_ALIVE = 60_000;

let feed: ReadingFeed;
let harness: Harness;
let stream: Stream;

beforeEach(async () => {
  feed = new ReadingFeed();
  harness = await serve(createApp(feed, { keepAliveMs: KEEP_ALIVE }));
});

afterEach(async () => {
  stream.disconnect();
  await harness.stop();
});

/** Open the stream and wait until the endpoint is listening to the meter. */
async function connect(): Promise<Stream> {
  stream = harness.open();
  await until(() => feed.subscriberCount > 0, 'the endpoint never subscribed to the meter');
  return stream;
}

describe('the endpoint answers with a live event stream', () => {
  it('sends its headers when the request arrives, not when the first reading does', async () => {
    await connect();

    await until(
      () => stream.responded,
      'nothing came back at all, so the client is still waiting to find out what this is'
    );
    expect(stream.status).toBe(200);
  });

  it('declares an event stream that nothing is allowed to cache', async () => {
    await connect();
    await until(() => stream.responded, 'no response headers arrived');

    expect(stream.headers['content-type'], 'EventSource refuses anything else').toMatch(
      /text\/event-stream/
    );
    expect(String(stream.headers['cache-control']), 'a stream is not a document').toContain(
      'no-store'
    );
  });

  it('sends each reading as its own event', async () => {
    await connect();
    feed.publish('web-1', 41);

    await until(() => stream.frames.length >= 1, 'the first reading never arrived as an event');
    expect(JSON.parse(stream.frames[0]?.data ?? 'null')).toEqual({ id: 1, host: 'web-1', cpu: 41 });

    feed.publish('db-1', 12);
    await until(() => stream.frames.length >= 2, 'the second reading never arrived');
    expect(JSON.parse(stream.frames[1]?.data ?? 'null')).toEqual({ id: 2, host: 'db-1', cpu: 12 });
  });

  it('ends every event with the blank line that dispatches it', async () => {
    await connect();
    feed.publish('web-1', 41);
    await until(() => stream.frames.length >= 1, 'no event arrived');

    expect(stream.text, 'the payload needs a data: field in front of it').toContain('data: ');
    expect(
      stream.text.endsWith('\n\n'),
      'without the blank line the client holds the event, waiting for the rest of it'
    ).toBe(true);
  });

  it('is still open afterwards, so the next reading is a write and not a request', async () => {
    await connect();
    feed.publish('web-1', 41);
    await until(() => stream.frames.length >= 1, 'no event arrived');

    expect(stream.ended, 'the response finished, so this is a poll wearing a stream costume').toBe(
      false
    );

    feed.publish('web-1', 55);
    await until(() => stream.frames.length >= 2, 'the connection was open but nothing else came');
  });
});
