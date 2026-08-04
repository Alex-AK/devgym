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
    jobTitle: screen.getByLabelText<HTMLInputElement>('Job title'),
    saveDisplayName: screen.getByRole<HTMLButtonElement>('button', { name: 'Save display name' }),
    saveJobTitle: screen.getByRole<HTMLButtonElement>('button', { name: 'Save job title' }),
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

describe('a failure takes back only its own change', () => {
  it('leaves a field saved in the meantime alone', async () => {
    const { user, displayName, jobTitle, saveDisplayName, saveJobTitle } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);

    await retype(user, jobTitle, 'Staff engineer');
    await user.click(saveJobTitle);

    await settle(() => saves[1]?.succeed());
    await settle(() => saves[0]?.fail());

    expect(published('display name'), 'the failed save is still on show').toBe('A. Bhatt');
    expect(published('job title'), 'a job title that saved fine was thrown away too').toBe(
      'Staff engineer'
    );
  });

  it('leaves what you typed after it alone', async () => {
    const { user, displayName, saveDisplayName } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);

    // Still in flight, and the person has carried on typing.
    await retype(user, displayName, 'Asha K Bhatt');

    await settle(() => saves[0]?.fail());

    expect(displayName.value, 'the rollback reached into the box and rewrote it').toBe(
      'Asha K Bhatt'
    );
    expect(published('display name'), 'the failed save is still on show').toBe('A. Bhatt');
  });

  it('does not let one save answer for another', async () => {
    const { user, displayName, jobTitle, saveDisplayName, saveJobTitle } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);

    await retype(user, jobTitle, 'Staff engineer');
    await user.click(saveJobTitle);

    // The job title lands. The server has not processed the display name yet, so
    // its reply still describes the old one.
    await settle(() => saves[1]?.succeed());

    expect(published('job title')).toBe('Staff engineer');
    expect(published('display name'), 'another save reverted a change still in flight').toBe(
      'Asha Bhatt'
    );

    await settle(() => saves[0]?.succeed());
    expect(published('display name')).toBe('Asha Bhatt');
    expect(published('job title')).toBe('Staff engineer');
  });
});
