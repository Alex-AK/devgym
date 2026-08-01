import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Autocomplete } from '../../src/client/Autocomplete';
import { fixture } from '../../src/client/api';

beforeEach(() => {
  fixture.reset();
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<Autocomplete label="Search products" debounceMs={20} />);
  return { user };
}

async function openTheList(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole('combobox'), 'bra');
  await screen.findByText('Bracket, heavy');
}

describe('a screen reader can follow it', () => {
  it('announces the box as a combobox, by its label', () => {
    setup();

    expect(screen.getByRole('combobox', { name: /search products/i })).toBeDefined();
  });

  it('says whether the list is showing', async () => {
    const { user } = setup();
    const input = screen.getByRole('combobox');

    expect(input.getAttribute('aria-expanded')).toBe('false');

    await openTheList(user);
    await waitFor(() => expect(input.getAttribute('aria-expanded')).toBe('true'));
  });

  it('points at the list it controls', async () => {
    const { user } = setup();
    await openTheList(user);

    const listbox = screen.getByRole('listbox');
    expect(screen.getByRole('combobox').getAttribute('aria-controls')).toBe(listbox.id);
  });

  it('offers the results as options', async () => {
    const { user } = setup();
    await openTheList(user);

    const options = screen.getAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual(['Bracket, heavy', 'Brass hinge']);
  });

  it('names the highlighted option, since focus never leaves the box', async () => {
    const { user } = setup();
    await openTheList(user);

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const active = screen.getByRole('combobox').getAttribute('aria-activedescendant');
      expect(active, 'nothing tells a screen reader which option is highlighted').toBeTruthy();
      expect(document.getElementById(active ?? '')?.textContent).toBe('Bracket, heavy');
    });
  });

  it('marks the highlighted option as the selected one', async () => {
    const { user } = setup();
    await openTheList(user);

    await user.keyboard('{ArrowDown}');

    await waitFor(() => {
      const selected = screen
        .getAllByRole('option')
        .filter((option) => option.getAttribute('aria-selected') === 'true');

      expect(selected.map((option) => option.textContent)).toEqual(['Bracket, heavy']);
    });
  });
});
