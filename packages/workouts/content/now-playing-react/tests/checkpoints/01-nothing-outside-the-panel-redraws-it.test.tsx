import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';

import { renderCountedPanel, renders, resetRenders, totalRenders } from '../support/panel';

/**
 * Pressing Follow is the page's business and none of the player's. Nothing the
 * panel reads is different afterwards, so nothing in the panel has a new version
 * to build.
 */
describe('nothing outside the panel redraws it', () => {
  beforeEach(resetRenders);

  it('leaves every part of the panel alone when the page around it redraws', async () => {
    const { user } = renderCountedPanel();

    await user.click(screen.getByRole('button', { name: 'Follow' }));

    // The page did redraw: the button says so.
    expect(screen.getByRole('button', { name: 'Following' })).not.toBeNull();
    expect(renders, 'the page redrew and took the panel with it').toEqual({
      header: 0,
      scrubber: 0,
      chapters: 0,
      shortcuts: 0,
    });
  });

  it('stays quiet however often the page redraws', async () => {
    const { user } = renderCountedPanel();

    await user.click(screen.getByRole('button', { name: 'Follow' }));
    await user.click(screen.getByRole('button', { name: 'Following' }));
    await user.click(screen.getByRole('button', { name: 'Follow' }));

    expect(
      totalRenders(),
      `three presses of a button outside the panel rebuilt parts of it ${totalRenders()} times`
    ).toBe(0);
  });
});
