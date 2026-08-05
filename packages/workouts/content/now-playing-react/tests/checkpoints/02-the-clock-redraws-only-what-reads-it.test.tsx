import { beforeEach, describe, expect, it } from 'vitest';

import { renderCountedPanel, renders, resetRenders, tick } from '../support/panel';

/**
 * The clock is the one thing on this page that moves on its own. Three seconds
 * of playback is three new versions of the parts that show the time, and none of
 * anything else.
 */
describe('the clock redraws only what reads it', () => {
  beforeEach(resetRenders);

  it('leaves the parts that do not read the clock alone', async () => {
    renderCountedPanel();

    await tick();
    await tick();
    await tick();

    expect(
      renders.header,
      `the show and the episode title never change, and the header was rebuilt ${renders.header} times`
    ).toBe(0);
    expect(
      renders.shortcuts,
      `the shortcuts put nothing on screen, and were rebuilt ${renders.shortcuts} times`
    ).toBe(0);
  });

  it('redraws the parts that do read it, once a second', async () => {
    renderCountedPanel();

    await tick();
    await tick();
    await tick();

    expect(renders.scrubber, `three seconds, ${renders.scrubber} versions of the scrubber`).toBe(3);
    expect(
      renders.chapters,
      `three seconds, ${renders.chapters} versions of the chapter list`
    ).toBe(3);
  });
});
