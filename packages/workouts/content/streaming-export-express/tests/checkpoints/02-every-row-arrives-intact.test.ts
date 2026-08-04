import { beforeAll, describe, expect, it } from 'vitest';

import { createApp } from '../../src/server/app';
import { ResponseMeter } from '../../src/server/meter';
import { Orders } from '../../src/server/orders';
import { expectedLines } from '../support/expected';
import { download, type Delivered } from '../support/slow-client';

const ORDERS = 20_000;

const orders = new Orders(ORDERS);
const expected = expectedLines(orders);

function short(line: string | undefined): string {
  if (line === undefined) return '(nothing)';
  return line.length > 90 ? `${line.slice(0, 90)}...` : line;
}

describe('every row arrives intact', () => {
  let delivered: Delivered | null = null;
  let refused: string | null = null;

  beforeAll(async () => {
    try {
      delivered = await download(createApp(orders, new ResponseMeter()), '/exports/orders.csv');
    } catch (error) {
      // Held rather than thrown, so every test below reports the same reason
      // instead of vitest skipping them all over a failed hook.
      refused = error instanceof Error ? error.message : String(error);
    }
  });

  const lines = (): string[] => {
    if (!delivered) throw new Error(refused ?? 'the export never arrived');
    return delivered.body.split('\n');
  };

  it('sends every order once, and one header row', () => {
    const sent = lines();
    // The file ends with a newline, so the split leaves one empty string behind.
    expect(sent.at(-1), 'the file does not end with a newline').toBe('');
    expect(sent.length - 1, `${sent.length - 1} lines arrived for ${ORDERS} orders`).toBe(
      expected.length
    );
  });

  it('sends them in the order the cursor gave them', () => {
    const sent = lines();
    const at = expected.findIndex((line, index) => sent[index] !== line);
    expect(
      at,
      at === -1
        ? ''
        : `line ${at + 1} came back as\n  ${short(sent[at])}\nand should have been\n  ${short(expected[at])}`
    ).toBe(-1);
  });

  it('quotes the fields that need it', () => {
    // Two customers hold a comma and one holds a pair of quotes. Unquoted, each
    // of them splits its row into the wrong number of columns. Asked as
    // includes() rather than toContain, because a failed toContain against a
    // megabyte prints the megabyte.
    const body = lines().join('\n');
    expect(body.includes('"Halden, Ross & Co"'), 'no row quoted a customer holding a comma').toBe(
      true
    );
    expect(body.includes('"The ""Quiet"" Bakery"'), 'no row quoted a customer holding quotes').toBe(
      true
    );
  });
});
