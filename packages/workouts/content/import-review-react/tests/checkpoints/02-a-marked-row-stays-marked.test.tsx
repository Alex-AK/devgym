import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ImportReview } from '../../src/client/ImportReview';
import { buildRows } from '../../src/client/rows';
import { mountedRows, referenceAt, referenceOf, rowFor, scrollTo, theList } from '../support/list';

const rows = buildRows(10_000);

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<ImportReview rows={rows} />);
  return { user, list: theList() };
}

/** The count in the header, which is what the person doing the import reads. */
function counter(): string {
  return screen.getByLabelText('Rows to skip').textContent ?? '';
}

function markedReferences(): string[] {
  return mountedRows()
    .filter((row) => row.getAttribute('aria-selected') === 'true')
    .map((row) => referenceOf(row) ?? '');
}

async function mark(user: ReturnType<typeof userEvent.setup>, index: number) {
  const row = rowFor(referenceAt(index));
  expect(row, `${referenceAt(index)} is not in the DOM to be marked`).not.toBeNull();
  await user.click(row as HTMLElement);
}

describe('a marked row stays marked', () => {
  it('marks the row that was clicked, and only that one', async () => {
    const { user } = setup();

    await mark(user, 2);

    expect(markedReferences()).toEqual([referenceAt(2)]);
    expect(counter()).toBe('1');
  });

  it('unmarks a row that is clicked again', async () => {
    const { user } = setup();

    await mark(user, 2);
    await mark(user, 2);

    expect(markedReferences()).toEqual([]);
    expect(counter()).toBe('0');
  });

  it('counts rows that are nowhere near the scroll position', async () => {
    const { user, list } = setup();

    await mark(user, 2);
    await mark(user, 5);
    scrollTo(list, 40_000);

    expect(counter(), 'the count dropped when the marked rows left the DOM').toBe('2');
    expect(markedReferences(), 'a row this far down the file was never marked').toEqual([]);
  });

  it('still has them marked when they come back', async () => {
    const { user, list } = setup();

    await mark(user, 2);
    await mark(user, 5);
    scrollTo(list, 40_000);
    scrollTo(list, 0);

    expect(markedReferences()).toEqual([referenceAt(2), referenceAt(5)]);
    expect(counter()).toBe('2');
  });
});
