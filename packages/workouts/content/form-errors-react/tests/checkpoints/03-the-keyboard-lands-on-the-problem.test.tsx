import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { fixture } from '../../src/client/api';
import { ContactDetailsForm } from '../../src/client/ContactDetailsForm';

beforeEach(() => {
  fixture.reset();
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<ContactDetailsForm />);

  return {
    user,
    fullName: screen.getByLabelText('Full name'),
    email: screen.getByLabelText('Email address'),
    phone: screen.getByLabelText('Phone number'),
    save: screen.getByRole('button', { name: /save/i }),
  };
}

describe('a failed submit puts the keyboard on the first problem', () => {
  it('leaves focus where the user put it until something is submitted', async () => {
    const { user, phone } = setup();

    await user.type(phone, '020 7946 0018');

    expect(document.activeElement).toBe(phone);
  });

  it('moves to the first field that needs fixing', async () => {
    const { user, save, fullName } = setup();

    await user.click(save);

    expect(
      document.activeElement,
      'the keyboard is still on the button that reported the failure'
    ).toBe(fullName);
  });

  it('moves to the next one once the first is filled in', async () => {
    const { user, save, fullName, email } = setup();

    await user.type(fullName, 'Ada Okonjo');
    await user.click(save);

    expect(document.activeElement).toBe(email);
  });

  it('moves to the last one when that is all that is left', async () => {
    const { user, save, fullName, email, phone } = setup();

    await user.type(fullName, 'Ada Okonjo');
    await user.type(email, 'ada@example.com');
    await user.click(save);

    expect(document.activeElement).toBe(phone);
  });

  it('then leaves focus alone while the fields are being fixed', async () => {
    const { user, save, phone } = setup();

    await user.click(save);
    await user.type(phone, '020 7946 0018');

    expect(document.activeElement, 'focus was pulled away mid-keystroke').toBe(phone);
  });
});
