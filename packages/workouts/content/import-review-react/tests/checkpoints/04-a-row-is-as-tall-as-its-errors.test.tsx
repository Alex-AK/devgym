import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ImportReview } from '../../src/client/ImportReview';
import { buildRows, ERROR_LINE_HEIGHT, ROW_HEIGHT } from '../../src/client/rows';
import { mountedRows, referenceAt, referenceOf, rowFor, scrollTo, theList } from '../support/list';

const rows = buildRows(10_000);

let list: HTMLElement;

beforeEach(() => {
  render(<ImportReview rows={rows} />);
  list = theList();
});

/**
 * jsdom has no layout, so nothing here is measured. These are the numbers the
 * list worked out for itself and wrote onto the row: its height, and how far
 * down the scrolling area it starts. They are what decides whether two rows
 * overlap on a real screen.
 */
function box(row: Element | null): { height: number; top: number } {
  const style = (row as HTMLElement | null)?.style;
  const offset = /translateY\((-?[\d.]+)px\)/.exec(style?.transform ?? '');
  return { height: Number.parseFloat(style?.height ?? ''), top: Number(offset?.[1]) };
}

function expectedHeight(index: number): number {
  return ROW_HEIGHT + (rows[index]?.errors.length ?? 0) * ERROR_LINE_HEIGHT;
}

function indexOf(row: Element): number {
  return Number(referenceOf(row)?.slice(4)) - 100_000;
}

describe('a row is as tall as its errors', () => {
  it('gives a clean row the standard height', () => {
    expect(box(rowFor(referenceAt(0))).height).toBe(ROW_HEIGHT);
  });

  it('makes room for the error lines under a row', () => {
    expect(box(rowFor(referenceAt(4))).height, 'one error line needs one line of room').toBe(
      ROW_HEIGHT + ERROR_LINE_HEIGHT
    );
    expect(box(rowFor(referenceAt(7))).height, 'two error lines need two').toBe(
      ROW_HEIGHT + 2 * ERROR_LINE_HEIGHT
    );
  });

  it('starts every row where the one above it ends', () => {
    const boxes = mountedRows().map((row) => ({ reference: referenceOf(row), ...box(row) }));

    for (let i = 1; i < boxes.length; i += 1) {
      const above = boxes[i - 1] as (typeof boxes)[number];
      const row = boxes[i] as (typeof boxes)[number];
      expect(
        row.top,
        `${row.reference} starts at ${row.top}, and ${above.reference} runs to ${above.top + above.height}`
      ).toBe(above.top + above.height);
    }
  });

  it('keeps the arithmetic right further down the file', () => {
    scrollTo(list, 40_000);
    const mounted = mountedRows();

    expect(mounted.length).toBeGreaterThan(0);
    for (const row of mounted) {
      const index = indexOf(row);
      expect(box(row).height, `wrong height on ${referenceAt(index)}`).toBe(expectedHeight(index));
    }
  });
});
