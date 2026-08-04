import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ImportReview } from '../../src/client/ImportReview';
import { buildRows } from '../../src/client/rows';
import { mountedRows, referenceAt, referenceOf, scrollTo, theList } from '../support/list';

const rows = buildRows(10_000);

function setup() {
  const user = userEvent.setup({ delay: null });
  render(
    <>
      <button type="button">Back to upload</button>
      <ImportReview rows={rows} />
    </>
  );
  return { user, list: theList() };
}

/** The row the focus is on, or what has it instead when it is not on a row at all. */
function focused(): string {
  const active = document.activeElement;
  if (active?.getAttribute('role') === 'option') return referenceOf(active) ?? 'an unnamed row';
  return active?.nodeName.toLowerCase() ?? 'nothing';
}

function tabbableRows(): HTMLElement[] {
  return mountedRows().filter((row) => row.getAttribute('tabindex') === '0');
}

/** Into the button first, then wherever the list has put its tab stop. */
async function tabIntoTheList(user: ReturnType<typeof userEvent.setup>) {
  await user.tab();
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back to upload' }));
  await user.tab();
}

describe('the cursor survives a scroll', () => {
  it('does not take the focus on load', () => {
    setup();

    expect(document.activeElement, 'the list took the focus without being asked').toBe(
      document.body
    );
  });

  it('is one stop in the tab order rather than ten thousand', async () => {
    const { user } = setup();

    await tabIntoTheList(user);

    expect(focused(), 'tab went past the list').toBe(referenceAt(0));
    expect(
      tabbableRows().length,
      `${tabbableRows().length} of the rows on screen are in the tab order`
    ).toBe(1);
  });

  it('moves the cursor with the arrow keys', async () => {
    const { user } = setup();
    await tabIntoTheList(user);

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');
    expect(focused()).toBe(referenceAt(3));

    await user.keyboard('{ArrowUp}');
    expect(focused()).toBe(referenceAt(2));
  });

  it('puts the cursor back on the row it was on', async () => {
    const { user, list } = setup();
    await tabIntoTheList(user);
    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowDown}');

    scrollTo(list, 40_000);
    scrollTo(list, 0);

    expect(focused(), 'the cursor did not come back with the row').toBe(referenceAt(3));
  });

  it('lets the focus leave for good when it is tabbed away', async () => {
    const { user, list } = setup();
    await tabIntoTheList(user);
    await user.tab({ shift: true });

    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Back to upload' }));

    scrollTo(list, 40_000);
    scrollTo(list, 0);

    expect(focused(), 'the list took the focus back off the button').toBe('button');
  });
});
