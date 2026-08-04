import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ResponseMeter } from '../../src/server/meter';
import { Orders } from '../../src/server/orders';
import { expectedCsv, kib } from '../support/expected';
import { download, type Delivered } from '../support/slow-client';

const ORDERS = 20_000;

/**
 * Four times the 64 KiB a response holds before it starts saying so, which
 * leaves room to write in chunks and none to write the file into the socket and
 * hope. The export itself is about twenty times this.
 */
const LIMIT = 262_144;

const orders = new Orders(ORDERS);
const expectedBytes = Buffer.byteLength(expectedCsv(orders));

describe('nothing piles up behind a slow client', () => {
  const meter = new ResponseMeter();
  let delivered: Delivered | null = null;
  let refused: string | null = null;

  beforeAll(async () => {
    try {
      delivered = await download(createApp(orders, meter), '/exports/orders.csv');
    } catch (error) {
      // Held rather than thrown, so both tests below report the same reason
      // instead of vitest skipping them over a failed hook. A response that
      // never finished has not held its memory down; it has stopped.
      refused = error instanceof Error ? error.message : String(error);
    }
  });

  const arrived = (): Delivered => {
    if (!delivered) throw new Error(refused ?? 'the export never arrived');
    return delivered;
  };

  it('holds no more than 256 KiB at a time', () => {
    arrived();
    expect(
      meter.peakBufferedBytes,
      `the response had ${kib(meter.peakBufferedBytes)} queued at its worst, ` +
        `out of a ${kib(expectedBytes)} export`
    ).toBeLessThan(LIMIT);
  });

  it('sends the whole export anyway', () => {
    // Otherwise the cheapest way past the checkpoint above is to send less.
    const bytes = arrived().bytes;
    expect(bytes, `${kib(bytes)} arrived of ${kib(expectedBytes)}`).toBe(expectedBytes);
  });
});
