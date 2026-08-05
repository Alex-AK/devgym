import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderScreen, tick } from '../support/panel';

/**
 * The chapter list reads the episode and the clock, and it is only right when it
 * has both. This one mounts the panel the way the app does, with no counting in
 * the way: whatever else is true, the marked chapter has to be the one being
 * played.
 */
function markedChapter(): string {
  const marked = document.querySelector('[aria-current="true"]');
  return marked?.textContent?.trim() ?? 'nothing';
}

describe('the chapter list follows the clock', () => {
  it('marks the chapter the playhead is inside', async () => {
    renderScreen();

    expect(markedChapter()).toContain('Cold open');

    await tick(200);

    expect(markedChapter(), 'three and a bit minutes in, the second chapter has started').toContain(
      'How Friday deploys got their name'
    );

    await tick(1000);

    expect(markedChapter()).toContain('Feature flags in practice');
  });

  it('shows the time that goes with it', async () => {
    renderScreen();

    await tick(1880);

    expect(screen.getByLabelText('Elapsed').textContent).toBe('31:20');
    expect(markedChapter()).toContain('Rolling back without a rollback');
  });

  it('jumps to a chapter when its button is pressed', async () => {
    const { user } = renderScreen();

    await user.click(screen.getByRole('button', { name: /Listener questions/ }));

    expect(screen.getByLabelText('Elapsed').textContent).toBe('46:00');
    expect(markedChapter()).toContain('Listener questions');
  });

  it('still plays and pauses', async () => {
    const { user } = renderScreen();

    await user.click(screen.getByRole('button', { name: 'Play' }));

    expect(screen.getByRole('button', { name: 'Pause' })).not.toBeNull();
  });
});
