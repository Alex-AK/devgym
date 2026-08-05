import { useState, type ReactNode } from 'react';

import { EPISODE, type Episode } from './episode';
import { NowPlayingPanel } from './NowPlayingPanel';
import { PlayerProvider } from './PlayerProvider';

export interface EpisodePageProps {
  episode: Episode;
  /** The now-playing panel. It is built by the caller and passed in. */
  children: ReactNode;
}

/**
 * The page an episode is listened to on: the show notes, the follow button, and
 * the player.
 *
 * This file is the page around the panel, and it is read-only.
 */
export function EpisodePage({ episode, children }: EpisodePageProps) {
  const [following, setFollowing] = useState(false);

  return (
    <main>
      <h1>{episode.show}</h1>
      <button type="button" onClick={() => setFollowing((current) => !current)}>
        {following ? 'Following' : 'Follow'}
      </button>
      <PlayerProvider episode={episode}>{children}</PlayerProvider>
    </main>
  );
}

/** The page as it is mounted in the app. */
export function EpisodeScreen() {
  return (
    <EpisodePage episode={EPISODE}>
      <NowPlayingPanel />
    </EpisodePage>
  );
}
