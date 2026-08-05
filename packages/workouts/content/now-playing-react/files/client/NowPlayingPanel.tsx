import { useEffect } from 'react';

import { chapterAt, formatClock } from './episode';
import {
  usePlayerControls,
  usePlayerEpisode,
  usePlayerPlaying,
  usePlayerPosition,
} from './PlayerProvider';

/**
 * The four parts of the now-playing panel, and the panel that composes them.
 *
 * Each one takes what it needs and nothing else, which is why there is a hook
 * per piece of player state rather than one that hands back all of it.
 *
 * This file is the panel; the work is in PlayerProvider.tsx.
 */

/** The show and the episode. Neither changes while you listen. */
export function EpisodeHeader() {
  const episode = usePlayerEpisode();

  return (
    <header>
      <p>{episode.show}</p>
      <h2>{episode.title}</h2>
    </header>
  );
}

/** The chapters, with the one being played marked. */
export function ChapterList() {
  const episode = usePlayerEpisode();
  const positionSeconds = usePlayerPosition();
  const controls = usePlayerControls();
  const current = chapterAt(episode.chapters, positionSeconds);

  return (
    <ul aria-label="Chapters">
      {episode.chapters.map((chapter) => (
        <li key={chapter.startSeconds}>
          <button
            type="button"
            aria-current={chapter === current ? 'true' : undefined}
            onClick={() => controls.seekTo(chapter.startSeconds)}
          >
            {chapter.title} <span>{formatClock(chapter.startSeconds)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** Play, pause, where you are, and dragging to somewhere else. */
export function Scrubber() {
  const episode = usePlayerEpisode();
  const positionSeconds = usePlayerPosition();
  const isPlaying = usePlayerPlaying();
  const controls = usePlayerControls();

  return (
    <div>
      <button type="button" onClick={() => controls.toggle()}>
        {isPlaying ? 'Pause' : 'Play'}
      </button>
      <output aria-label="Elapsed">{formatClock(positionSeconds)}</output>
      <input
        type="range"
        aria-label="Seek"
        min={0}
        max={episode.durationSeconds}
        value={positionSeconds}
        onChange={(event) => controls.seekTo(Number(event.target.value))}
      />
      <output aria-label="Duration">{formatClock(episode.durationSeconds)}</output>
    </div>
  );
}

/**
 * Space, and the arrow keys for the two skips. Renders nothing: it is here for
 * the keyboard, which works wherever you are on the page.
 */
export function PlayerShortcuts() {
  const controls = usePlayerControls();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight') controls.skip(30);
      else if (event.key === 'ArrowLeft') controls.skip(-15);
      else if (event.key === ' ') controls.toggle();
      else return;
      event.preventDefault();
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [controls]);

  return null;
}

export function NowPlayingPanel() {
  return (
    <section aria-label="Now playing">
      <EpisodeHeader />
      <Scrubber />
      <ChapterList />
      <PlayerShortcuts />
    </section>
  );
}
