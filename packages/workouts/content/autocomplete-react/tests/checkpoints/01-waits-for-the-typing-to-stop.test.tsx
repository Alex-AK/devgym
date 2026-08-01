import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Autocomplete } from '../../src/client/Autocomplete';
import { calls, fixture } from '../../src/client/api';

const DEBOUNCE = 150;

beforeEach(() => {
  fixture.reset();
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<Autocomplete label="Search products" debounceMs={DEBOUNCE} />);
  return { user, input: screen.getByLabelText('Search products') };
}

describe('it waits for the typing to stop', () => {
  it('sends nothing while the keys are still coming', async () => {
    const { user, input } = setup();

    await user.type(input, 'brack');

    expect(calls.length, `${calls.length} searches for five keystrokes`).toBe(0);
  });

  it('sends one search once the typing stops', async () => {
    const { user, input } = setup();

    await user.type(input, 'brack');
    await waitFor(() => expect(calls.length).toBe(1));

    expect(calls[0]?.query.trim()).toBe('brack');
  });

  it('honours the debounce it was given rather than one of its own', async () => {
    const { user, input } = setup();

    await user.type(input, 'bra');
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3));

    expect(calls.length, 'nothing was sent well after the debounce had passed').toBe(1);
  });

  it('searches again when the user carries on typing', async () => {
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    await user.type(input, 'ss');
    await waitFor(() => expect(calls.length).toBe(2));

    expect(calls[1]?.query.trim()).toBe('brass');
  });

  it('does not search for an empty box', async () => {
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    await user.clear(input);
    await new Promise((resolve) => setTimeout(resolve, DEBOUNCE * 3));

    expect(calls.length, 'clearing the box sent a search for nothing').toBe(1);
  });
});
