import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { calls, fixture } from '../../src/client/api';
import { ContactDetailsForm } from '../../src/client/ContactDetailsForm';
import { SAVE_FAILED, SAVED } from '../../src/client/rules';

beforeEach(() => {
  fixture.reset();
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<ContactDetailsForm />);

  return {
    user,
    phone: screen.getByLabelText('Phone number'),
    save: screen.getByRole('button', { name: /save/i }),
  };
}

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Ada Okonjo');
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Phone number'), '020 7946 0018');
}

/** Wait for a message to reach the page, wherever the form chose to put it. */
async function settled(text: string) {
  await waitFor(() => expect(screen.getByText(text)).toBeDefined());
}

describe('one press, one save', () => {
  it('sends nothing at all when the form has not passed', async () => {
    const { user, save } = setup();

    await user.click(save);

    expect(calls, 'a form that failed validation still called the API').toHaveLength(0);
  });

  it('sends one save for two presses', async () => {
    const { user, save } = setup();
    await fillIn(user);

    const release = fixture.hold();
    await user.click(save);
    await user.click(save);

    expect(calls, 'the second press started a second save').toHaveLength(1);
    expect(calls[0]?.details).toEqual({
      fullName: 'Ada Okonjo',
      email: 'ada@example.com',
      phone: '020 7946 0018',
    });

    release();
    await settled(SAVED);
    expect(calls).toHaveLength(1);
  });

  it('takes a second save once the first has finished', async () => {
    const { user, save, phone } = setup();
    await fillIn(user);

    const release = fixture.hold();
    await user.click(save);
    release();
    await settled(SAVED);

    await user.clear(phone);
    await user.type(phone, '020 7946 0099');
    await user.click(save);

    await waitFor(() => expect(calls).toHaveLength(2));
    expect(calls[1]?.details.phone).toBe('020 7946 0099');
  });

  it('gives the form back when a save fails', async () => {
    const { user, save } = setup();
    fixture.failNext();
    await fillIn(user);

    await user.click(save);
    await settled(SAVE_FAILED);

    await user.click(save);

    await waitFor(() =>
      expect(calls, 'one dropped connection and the form never submits again').toHaveLength(2)
    );
    await settled(SAVED);
  });
});
