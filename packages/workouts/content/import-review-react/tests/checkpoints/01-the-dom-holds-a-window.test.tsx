import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { ImportReview } from '../../src/client/ImportReview';
import { buildRows } from '../../src/client/rows';
import {
  mountedReferences,
  mountedRows,
  referenceAt,
  referenceOf,
  scrollTo,
  theList,
} from '../support/list';

const rows = buildRows(10_000);

let list: HTMLElement;

beforeEach(() => {
  render(<ImportReview rows={rows} />);
  list = theList();
});

describe('the DOM holds a window, not the file', () => {
  it('mounts a fraction of the file at a time', () => {
    const mounted = mountedRows();

    expect(mounted.length).toBeGreaterThan(0);
    expect(mounted.length, `${mounted.length} of 10,000 rows are in the DOM`).toBeLessThan(60);
  });

  it('mounts different rows once it has been scrolled', () => {
    const before = mountedReferences();
    scrollTo(list, 40_000);
    const after = mountedReferences();

    expect(after.length).toBeGreaterThan(0);
    expect(
      after.filter((reference) => before.includes(reference)),
      'the same rows are on screen after scrolling 40,000 pixels'
    ).toEqual([]);
  });

  it('tells a screen reader how long the list really is', () => {
    for (const row of mountedRows()) {
      expect(
        row.getAttribute('aria-setsize'),
        `${referenceOf(row)} does not say how many rows the file has`
      ).toBe('10000');
    }
  });

  it('numbers a row by its place in the file, not its place in the window', () => {
    scrollTo(list, 40_000);

    for (const row of mountedRows()) {
      const index = Number(referenceOf(row)?.slice(4)) - 100_000;
      expect(row.getAttribute('aria-posinset'), `wrong position on ${referenceAt(index)}`).toBe(
        String(index + 1)
      );
    }
  });
});
