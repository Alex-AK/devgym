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

const alertText = (): string =>
  screen
    .queryAllByRole('alert')
    .map((node) => node.textContent ?? '')
    .join(' ')
    .toLowerCase();

describe('a save that failed says so', () => {
  it('names the field that did not save', async () => {
    const { user, displayName, saveDisplayName } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);
    await settle(() => saves[0]?.fail());

    const alert = screen.queryAllByRole('alert');
    expect(alert.length, 'the change was taken back without a word').toBeGreaterThan(0);
    expect(alertText(), 'the message does not say which field it is about').toContain(
      'display name'
    );
  });

  it('says nothing while the save is in flight, or when it works', async () => {
    const { user, jobTitle, saveJobTitle } = setup();

    await retype(user, jobTitle, 'Staff engineer');
    await user.click(saveJobTitle);
    expect(
      screen.queryByRole('alert'),
      'a save still in flight was reported as a failure'
    ).toBeNull();

    await settle(() => saves[0]?.succeed());
    expect(screen.queryByRole('alert'), 'a save that worked was reported as a failure').toBeNull();
  });

  it('takes the message back when a later save of that field works', async () => {
    const { user, displayName, saveDisplayName } = setup();

    await retype(user, displayName, 'Asha Bhatt');
    await user.click(saveDisplayName);
    await settle(() => saves[0]?.fail());
    expect(screen.queryAllByRole('alert').length).toBeGreaterThan(0);

    await user.click(saveDisplayName);
    await settle(() => saves[1]?.succeed());

    expect(screen.queryByRole('alert'), 'the message outlived the problem').toBeNull();
    expect(screen.getByLabelText('Published display name').textContent).toBe('Asha Bhatt');
  });
});
