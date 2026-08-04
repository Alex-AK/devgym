import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ResponseMeter } from '../../src/server/meter';
import { Orders } from '../../src/server/orders';
import { HEADER } from '../support/expected';
import { download, type Delivered } from '../support/slow-client';

// Two hundred orders. This checkpoint is about what the response says it is,
// not about how much of it there is.
const ORDERS = 200;

describe('the export downloads as a CSV file', () => {
  let delivered: Delivered | null = null;
  let refused: string | null = null;

  beforeAll(async () => {
    const app = createApp(new Orders(ORDERS), new ResponseMeter());
    try {
      delivered = await download(app, '/exports/orders.csv');
    } catch (error) {
      // Held rather than thrown, so every test below reports the same reason
      // instead of vitest skipping them all over a failed hook.
      refused = error instanceof Error ? error.message : String(error);
    }
  });

  const response = (): Delivered => {
    if (!delivered) throw new Error(refused ?? 'the export never arrived');
    return delivered;
  };

  it('answers 200', () => {
    expect(response().status).toBe(200);
  });

  it('calls itself a CSV', () => {
    const type = response().headers['content-type'] ?? '(none)';
    expect(type, `the response came back as ${type}`).toMatch(/^text\/csv\b/);
  });

  it('offers itself as a download named orders.csv', () => {
    const disposition = response().headers['content-disposition'] ?? '(none)';
    expect(disposition, `Content-Disposition was ${disposition}`).toMatch(/^attachment\b/);
    expect(disposition).toMatch(/filename="?orders\.csv"?/);
  });

  it('starts with the header row', () => {
    expect(response().body.split('\n')[0]).toBe(HEADER);
  });
});
