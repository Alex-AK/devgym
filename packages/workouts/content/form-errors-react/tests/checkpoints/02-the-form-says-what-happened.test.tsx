import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { fixture } from '../../src/client/api';
import { ContactDetailsForm } from '../../src/client/ContactDetailsForm';
import { SAVE_FAILED, SAVED, summarise } from '../../src/client/rules';

beforeEach(() => {
  fixture.reset();
});

/**
 * jsdom has no accessibility tree, so nothing here can hear a screen reader.
 * What it can check is the contract that makes one speak: a region the browser
 * is already watching, and a message that arrives into it as a change.
 */
function liveRegions(): HTMLElement[] {
  return Array.from(
    document.querySelectorAll<HTMLElement>('[role="status"], [role="alert"], [aria-live], output')
  );
}

function setup() {
  const user = userEvent.setup({ delay: null });
  render(<ContactDetailsForm />);

  return {
    user,
    mounted: liveRegions(),
    fullName: screen.getByLabelText('Full name'),
    email: screen.getByLabelText('Email address'),
    phone: screen.getByLabelText('Phone number'),
    save: screen.getByRole('button', { name: /save/i }),
  };
}

async function fillIn(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Full name'), 'Ada Okonjo');
  await user.type(screen.getByLabelText('Email address'), 'ada@example.com');
  await user.type(screen.getByLabelText('Phone number'), '020 7946 0018');
}

/** The region carrying `text`, waited for, and it has to be one of `mounted`. */
async function announced(mounted: HTMLElement[], text: string) {
  await waitFor(() => {
    const carrying = liveRegions().find((region) => region.textContent?.includes(text));
    expect(carrying, `nothing announces "${text}"`).toBeDefined();
    expect(
      mounted,
      `"${text}" arrived in a region that was not in the page beforehand, so there was no change to announce`
    ).toContain(carrying);
  });
}

describe('the form says what happened', () => {
  it('has somewhere to speak from before it has anything to say', () => {
    const { mounted } = setup();

    expect(mounted.length, 'the form has no live region in it').toBeGreaterThan(0);
    for (const region of mounted) {
      expect(region.textContent, 'a live region starts with something already in it').toBe('');
    }
  });

  it('announces how many fields need attention', async () => {
    const { user, mounted, save } = setup();

    await user.click(save);

    await announced(mounted, summarise(3));
  });

  it('announces the smaller count on the next attempt', async () => {
    const { user, mounted, save, fullName } = setup();

    await user.click(save);
    await user.type(fullName, 'Ada Okonjo');
    await user.click(save);

    await announced(mounted, summarise(2));
  });

  it('announces a save that worked', async () => {
    const { user, mounted, save } = setup();

    await fillIn(user);
    await user.click(save);

    await announced(mounted, SAVED);
  });

  it('announces a save that did not', async () => {
    const { user, mounted, save } = setup();
    fixture.failNext();

    await fillIn(user);
    await user.click(save);

    await announced(mounted, SAVE_FAILED);
  });
});
