import { act, render, screen } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { ProfileSettings } from '../../src/client/ProfileSettings';
import { fixture, saves } from '../../src/client/api';

beforeEach(() => {
  fixture.reset();
});

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<ProfileSettings />);
  return {
    user,
    displayName: screen.getByLabelText<HTMLInputElement>('Display name'),
    saveDisplayName: screen.getByRole<HTMLButtonElement>('button', { name: 'Save display name' }),
  };
}

const published = (label: string): string =>
  screen.getByLabelText(`Published ${label}`).textContent ?? '';

async function retype(user: UserEvent, input: HTMLInputElement, value: string): Promise<void> {
  expect(input.disabled, `#${input.id} is disabled, so nothing can be typed into it`).toBe(false);
  await user.clear(input);
  await user.type(input, value);
}

async function settle(answer: () => void): Promise<void> {
  await act(async () => {
    answer();
    await Promise.resolve();
    await Promise.resolve();
  });
}

/**
 * Two saves of the same field, both in flight. The server writes them in the
 * order it got them, so its reply to the first describes a profile that the
 * second has already moved past. Which reply comes back first is the network's
 * business, and here it is these lines' business.
 */
async function saveTwice(): Promise<void> {
  const { user, displayName, saveDisplayName } = setup();

  await retype(user, displayName, 'Asha Bhatt');
  await user.click(saveDisplayName);

  await retype(user, displayName, 'Asha K Bhatt');
  await user.click(saveDisplayName);

  expect(saves.length, 'the same field could not be saved twice before the first came back').toBe(
    2
  );
}

describe('a late answer cannot bring back an old value', () => {
  it('ignores the older reply when it arrives second', async () => {
    await saveTwice();

    await settle(() => saves[1]?.succeed());
    expect(published('display name')).toBe('Asha K Bhatt');

    await settle(() => saves[0]?.succeed());

    expect(published('display name'), 'a reply to the abandoned save put its value back').toBe(
      'Asha K Bhatt'
    );
  });

  it('does not roll back over a value that saved after it', async () => {
    await saveTwice();

    await settle(() => saves[1]?.succeed());
    await settle(() => saves[0]?.fail());

    expect(published('display name'), 'a stale failure rolled back a newer, saved value').toBe(
      'Asha K Bhatt'
    );
    expect(
      screen.queryByRole('alert'),
      'the field did save, so a stale failure is not news for it'
    ).toBeNull();
  });

  it('still works when the replies arrive in order', async () => {
    await saveTwice();

    await settle(() => saves[0]?.succeed());
    expect(published('display name')).toBe('Asha K Bhatt');

    await settle(() => saves[1]?.succeed());

    expect(published('display name')).toBe('Asha K Bhatt');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
