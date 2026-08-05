import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Profiler, type ReactNode } from 'react';

import { EPISODE } from '../../src/client/episode';
import { EpisodePage, EpisodeScreen } from '../../src/client/EpisodePage';
import {
  ChapterList,
  EpisodeHeader,
  PlayerShortcuts,
  Scrubber,
} from '../../src/client/NowPlayingPanel';
import { player } from '../../src/client/player-engine';

/**
 * The panel, with a Profiler around each of its four parts.
 *
 * A Profiler's onRender runs once per commit that touched its own subtree, so a
 * part that React left alone is not counted and a part it redrew is. That is the
 * whole instrument: no clock, no duration, just how many versions of each part
 * were built.
 */

export type PanelPart = 'header' | 'scrubber' | 'chapters' | 'shortcuts';

export const renders: Record<PanelPart, number> = {
  header: 0,
  scrubber: 0,
  chapters: 0,
  shortcuts: 0,
};

export function resetRenders(): void {
  renders.header = 0;
  renders.scrubber = 0;
  renders.chapters = 0;
  renders.shortcuts = 0;
}

function Counted({ part, children }: { part: PanelPart; children: ReactNode }) {
  return (
    <Profiler
      id={part}
      onRender={() => {
        renders[part] += 1;
      }}
    >
      {children}
    </Profiler>
  );
}

/** The same four parts NowPlayingPanel composes, each behind its own counter. */
function CountedPanel() {
  return (
    <section aria-label="Now playing">
      <Counted part="header">
        <EpisodeHeader />
      </Counted>
      <Counted part="scrubber">
        <Scrubber />
      </Counted>
      <Counted part="chapters">
        <ChapterList />
      </Counted>
      <Counted part="shortcuts">
        <PlayerShortcuts />
      </Counted>
    </section>
  );
}

/**
 * Mount the page with the counted panel inside it, and start counting from
 * after the mount: every part is built once on the way in, and that one is
 * nobody's fault.
 */
export function renderCountedPanel() {
  player.reset();
  const user = userEvent.setup({ delay: null });
  render(
    <EpisodePage episode={EPISODE}>
      <CountedPanel />
    </EpisodePage>
  );
  resetRenders();
  return { user };
}

/** The page exactly as the app mounts it, for the checkpoints that count nothing. */
export function renderScreen() {
  player.reset();
  const user = userEvent.setup({ delay: null });
  render(<EpisodeScreen />);
  return { user };
}

/** Playback: the seconds go by and the engine tells React about it. */
export async function tick(seconds = 1): Promise<void> {
  await act(async () => {
    player.advance(seconds);
  });
}

export function totalRenders(): number {
  return Object.values(renders).reduce((total, count) => total + count, 0);
}
