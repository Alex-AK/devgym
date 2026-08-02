import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InvoicePanel } from '../../src/client/InvoicePanel';

const total = (): string => screen.getByLabelText('Invoice total').textContent ?? '';

/** The amount cell of every line currently drawn. */
function amounts(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[2]?.textContent ?? '');
}

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<InvoicePanel />);
  return { user, filter: screen.getByLabelText('Filter lines') };
}

describe('the total is the total of the rows on screen', () => {
  it('adds up the whole invoice when the box is empty', () => {
    setup();

    expect(total()).toBe('£4078.00');
  });

  it('adds up only the rows the filter left', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'design');

    expect(amounts(), 'the wrong rows are on screen').toEqual(['£900.00', '£820.00']);
    expect(total(), 'the total counts lines that are not on screen').toBe('£1720.00');
  });

  it('goes back to the whole invoice when the box is cleared', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'design');
    await user.clear(filter);

    expect(total()).toBe('£4078.00');
  });

  it('is zero when nothing matches', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'catering');

    expect(amounts()).toEqual([]);
    expect(total(), 'no rows on screen, and a total anyway').toBe('£0.00');
  });

  it('drops a removed line out of the total', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Remove Design system audit' }));

    expect(total()).toBe('£3258.00');
  });

  it('stays right when a line is removed while the list is filtered', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'sprint');
    await user.click(screen.getByRole('button', { name: 'Remove Frontend build, sprint 1' }));

    expect(total()).toBe('£760.00');
  });
});
