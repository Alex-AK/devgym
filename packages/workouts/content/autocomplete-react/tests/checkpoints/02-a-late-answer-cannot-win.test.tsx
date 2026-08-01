import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { Autocomplete } from '../../src/client/Autocomplete';
import { calls, fixture } from '../../src/client/api';

const DEBOUNCE = 40;
const SLOW = 400;

beforeEach(() => {
  fixture.reset();
});

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<Autocomplete label="Search products" debounceMs={DEBOUNCE} />);
  return { user, input: screen.getByLabelText('Search products') };
}

/**
 * "bra" matches the bracket and the brass hinge; "brac" matches only the
 * bracket. So if the answer to "bra" arrives after the answer to "brac" and
 * wins, the brass hinge appears in a list that should not have it.
 */
describe('a late answer cannot overwrite a newer one', () => {
  it('shows the results of what was typed last', async () => {
    fixture.delay('bra', SLOW);
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    await user.type(input, 'c');
    await waitFor(() => expect(calls.length).toBe(2));
    expect(await screen.findByText('Bracket, heavy')).toBeDefined();

    // Long enough for the answer to "bra" to turn up.
    await sleep(SLOW);

    expect(
      screen.queryByText('Brass hinge'),
      'the answer to the abandoned search landed and took over the list'
    ).toBeNull();
  });

  it('calls off the search it no longer wants', async () => {
    fixture.delay('bra', SLOW);
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    await user.type(input, 'c');
    await waitFor(() => expect(calls.length).toBe(2));

    await waitFor(() =>
      expect(calls[0]?.settled, 'the first search was left to run to completion').toBe('aborted')
    );
  });

  it('passes a signal, which is what makes calling it off possible', async () => {
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    expect(calls[0]?.signal, 'searchProducts was called without a signal').toBeDefined();
  });

  it('does not treat its own cancellation as a failure', async () => {
    // Both searches are slow, so the check happens while the second is still in
    // flight. Let the second one land first and it would clear an error message
    // the abort had put up, hiding the flicker the user actually sees.
    fixture.delay('bra', SLOW);
    fixture.delay('brac', SLOW);
    const { user, input } = setup();

    await user.type(input, 'bra');
    await waitFor(() => expect(calls.length).toBe(1));

    await user.type(input, 'c');
    await waitFor(() => expect(calls[0]?.settled).not.toBe('pending'));
    await sleep(50);

    expect(
      screen.queryByRole('alert'),
      'aborting on purpose is not an error worth showing anybody'
    ).toBeNull();
  });
});
