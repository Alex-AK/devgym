import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { type Episode } from './episode';
import { player } from './player-engine';

export interface PlayerControls {
  toggle: () => void;
  skip: (seconds: number) => void;
  seekTo: (seconds: number) => void;
}

interface PlayerValue {
  episode: Episode;
  positionSeconds: number;
  isPlaying: boolean;
  controls: PlayerControls;
}

const PlayerContext = createContext<PlayerValue | null>(null);

function usePlayer(): PlayerValue {
  const value = useContext(PlayerContext);
  if (!value) throw new Error('The player hooks only work inside <PlayerProvider>.');
  return value;
}

/** What the panel reads. One hook each, so nothing takes more than it needs. */
export function usePlayerEpisode(): Episode {
  return usePlayer().episode;
}

export function usePlayerPosition(): number {
  return usePlayer().positionSeconds;
}

export function usePlayerPlaying(): boolean {
  return usePlayer().isPlaying;
}

export function usePlayerControls(): PlayerControls {
  return usePlayer().controls;
}

export interface PlayerProviderProps {
  episode: Episode;
  children: ReactNode;
}

/**
 * Holds the player state for the page and hands it to the panel.
 *
 * TODO: the episode page has come back twice. See brief.md.
 */
export function PlayerProvider({ episode, children }: PlayerProviderProps) {
  const [positionSeconds, setPositionSeconds] = useState(player.positionSeconds);
  const [isPlaying, setIsPlaying] = useState(player.isPlaying);

  useEffect(
    () =>
      player.subscribe(() => {
        setPositionSeconds(player.positionSeconds);
        setIsPlaying(player.isPlaying);
      }),
    []
  );

  return (
    <PlayerContext
      value={{
        episode,
        positionSeconds,
        isPlaying,
        controls: {
          toggle: () => player.toggle(),
          skip: (seconds) => player.skip(seconds),
          seekTo: (seconds) => player.seekTo(seconds),
        },
      }}
    >
      {children}
    </PlayerContext>
  );
}
