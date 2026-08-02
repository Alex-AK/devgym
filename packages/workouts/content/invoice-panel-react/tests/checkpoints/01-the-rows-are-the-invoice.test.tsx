import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { InvoicePanel } from '../../src/client/InvoicePanel';

/** The description cell of every line currently drawn, in the order drawn. */
function descriptions(): string[] {
  return screen
    .getAllByRole('row')
    .slice(1)
    .map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<InvoicePanel />);
  return { user, filter: screen.getByLabelText('Filter lines') };
}

describe('the rows on screen are the lines on the invoice', () => {
  it('starts with every line', () => {
    setup();

    expect(descriptions()).toEqual([
      'Design discovery workshop',
      'Design system audit',
      'Frontend build, sprint 1',
      'Frontend build, sprint 2',
      'Accessibility review',
      'Hosting, twelve months',
    ]);
  });

  it('keeps the lines that match what is typed, whatever the case', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'DESIGN');

    expect(descriptions()).toEqual(['Design discovery workshop', 'Design system audit']);
  });

  it('brings them all back when the box is cleared', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'design');
    await user.clear(filter);

    expect(descriptions()).toHaveLength(6);
  });

  it('drops a line as soon as it is removed', async () => {
    const { user } = setup();

    await user.click(screen.getByRole('button', { name: 'Remove Design system audit' }));

    expect(descriptions(), 'the removed line is still on screen').not.toContain(
      'Design system audit'
    );
    expect(descriptions()).toHaveLength(5);
  });

  it('drops the right line while the list is filtered', async () => {
    const { user, filter } = setup();

    await user.type(filter, 'sprint');
    expect(descriptions()).toHaveLength(2);

    await user.click(screen.getByRole('button', { name: 'Remove Frontend build, sprint 1' }));

    expect(descriptions()).toEqual(['Frontend build, sprint 2']);
  });
});
