import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Autocomplete } from '../../src/client/Autocomplete';
import { fixture } from '../../src/client/api';

beforeEach(() => {
  fixture.reset();
});

/** "bra" brings back the bracket first and the brass hinge second. */
async function openTheList() {
  const user = userEvent.setup({ delay: null });
  const chosen: string[] = [];
  render(
    <Autocomplete
      label="Search products"
      debounceMs={20}
      onSelect={(product) => chosen.push(product.name)}
    />
  );

  const input = screen.getByLabelText('Search products') as HTMLInputElement;
  await user.type(input, 'bra');
  await screen.findByText('Bracket, heavy');
  await screen.findByText('Brass hinge');

  return { user, input, chosen };
}

describe('the keyboard drives the list', () => {
  it('takes the first option on arrow down then enter', async () => {
    const { user, input, chosen } = await openTheList();

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(input.value).toBe('Bracket, heavy'));
    expect(chosen).toEqual(['Bracket, heavy']);
  });

  it('walks down the list', async () => {
    const { user, input } = await openTheList();

    await user.keyboard('{ArrowDown}{ArrowDown}{Enter}');

    await waitFor(() => expect(input.value).toBe('Brass hinge'));
  });

  it('walks back up it', async () => {
    const { user, input } = await openTheList();

    await user.keyboard('{ArrowDown}{ArrowDown}{ArrowUp}{Enter}');

    await waitFor(() => expect(input.value).toBe('Bracket, heavy'));
  });

  it('closes on escape without choosing anything', async () => {
    const { user, input, chosen } = await openTheList();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByText('Brass hinge')).toBeNull());
    expect(input.value).toBe('bra');
    expect(chosen).toEqual([]);
  });

  it('does nothing on enter when the user has not highlighted anything', async () => {
    const { user, input, chosen } = await openTheList();

    await user.keyboard('{Enter}');

    expect(chosen, 'enter picked something the user never moved to').toEqual([]);
    expect(input.value).toBe('bra');
  });

  it('closes the list once something has been chosen', async () => {
    const { user } = await openTheList();

    await user.keyboard('{ArrowDown}{Enter}');

    await waitFor(() => expect(screen.queryByText('Brass hinge')).toBeNull());
  });
});
