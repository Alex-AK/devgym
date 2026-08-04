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

/**
 * Nothing here settles on its own. `succeed()` and `fail()` are the only way a
 * request finishes, so the order answers arrive in is exactly the order these
 * lines put them in. No clock, real or fake, is involved.
 */
async function settle(answer: () => void): Promise<void> {
  await act(async () => {
    answer();
    await Promise.resolve();
    await Promise.resolve();
  });
}

describe('the change lands before the server answers', () => {
  it('publishes the new value while the save is still in flight', async () => {
    const { user, displayName, saveDisplayName } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);

    expect(saves.length, 'clicking save sent no request').toBe(1);
    expect(saves[0]?.field).toBe('displayName');
    expect(saves[0]?.value).toBe('Asha Bhatt');
    expect(saves[0]?.status, 'the request has already been answered').toBe('in-flight');

    expect(
      published('display name'),
      'the panel is waiting for the server before it shows it'
    ).toBe('Asha Bhatt');
  });

  it('leaves the panel usable while a save is in flight', async () => {
    const { user, displayName, jobTitle, saveDisplayName, saveJobTitle } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);

    expect(displayName.disabled, 'the field being saved is locked').toBe(false);
    expect(saveDisplayName.disabled, 'the same field cannot be saved again').toBe(false);
    expect(jobTitle.disabled, 'a field with nothing in flight is locked').toBe(false);

    await retype(user, jobTitle, 'Staff engineer');
    await user.click(saveJobTitle);

    expect(saves.length, 'a second save could not go out with the first still in flight').toBe(2);
    expect(published('job title')).toBe('Staff engineer');
  });

  it('keeps the value once the server confirms it', async () => {
    const { user, displayName, saveDisplayName } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);
    await settle(() => saves[0]?.succeed());

    expect(published('display name')).toBe('Asha Bhatt');
    expect(published('job title'), 'a save changed a field it was not given').toBe('Engineer');
    expect(screen.queryByRole('alert'), 'a save that worked reported a problem').toBeNull();
  });
});
