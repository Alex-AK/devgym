import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { renderCountedPanel, renders, resetRenders, tick } from '../support/panel';

/**
 * The keyboard handler is bound in an effect that lists what it closes over, so
 * how often it is torn down and bound again is a reading of how often that
 * changed. Counted at the window rather than through React: a listener is a
 * listener.
 */
let addEventListener: ReturnType<typeof vi.spyOn<Window, 'addEventListener'>>;

function keydownBindings(): number {
  return addEventListener.mock.calls.filter((call) => call[0] === 'keydown').length;
}

beforeEach(() => {
  resetRenders();
  addEventListener = vi.spyOn(window, 'addEventListener');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the shortcuts are set up once', () => {
  it('binds the keyboard once and leaves it bound', async () => {
    const { user } = renderCountedPanel();

    await tick();
    await tick();
    await user.click(screen.getByRole('button', { name: 'Follow' }));

    expect(
      keydownBindings(),
      `two seconds of playback and one press elsewhere on the page bound keydown ${keydownBindings()} times`
    ).toBe(1);
  });

  it('never has a second version to build', async () => {
    const { user } = renderCountedPanel();

    await tick();
    await user.click(screen.getByRole('button', { name: 'Follow' }));
    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(
      renders.shortcuts,
      `nothing the shortcuts read changed, and they were rebuilt ${renders.shortcuts} times`
    ).toBe(0);
  });

  it('still drives the player from the keyboard', async () => {
    const { user } = renderCountedPanel();

    await user.keyboard('{ArrowRight}');

    expect(screen.getByLabelText('Elapsed').textContent).toBe('0:30');

    await user.keyboard('{ArrowLeft}');

    expect(screen.getByLabelText('Elapsed').textContent).toBe('0:15');
  });
});
