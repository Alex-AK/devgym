import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { type Episode } from './episode';
import { player } from './player-engine';

export interface PlayerControls {
  toggle: () => void;
  skip: (seconds: number) => void;
  seekTo: (seconds: number) => void;
}

/**
 * One context per rate of change, because a context has one unit of
 * subscription and that unit is the whole value. Reading one field out of a
 * value is not a narrower subscription, so the episode and the clock cannot
 * share one and leave the header out of it. The number of contexts is the only
 * dial there is.
 *
 * Nothing published here is an object built during a render: two of them are
 * primitives, the episode is the prop as it arrived, and the controls are built
 * once. That is the other half of it. A value that is a fresh object each render
 * is never `Object.is` to the last one, so it announces a change that did not
 * happen, and every consumer redraws for it.
 */
const EpisodeContext = createContext<Episode | null>(null);
const PositionContext = createContext(0);
const PlayingContext = createContext(false);
const ControlsContext = createContext<PlayerControls | null>(null);

const OUTSIDE = 'The player hooks only work inside <PlayerProvider>.';

export function usePlayerEpisode(): Episode {
  const episode = useContext(EpisodeContext);
  if (!episode) throw new Error(OUTSIDE);
  return episode;
}

export function usePlayerPosition(): number {
  return useContext(PositionContext);
}

export function usePlayerPlaying(): boolean {
  return useContext(PlayingContext);
}

export function usePlayerControls(): PlayerControls {
  const controls = useContext(ControlsContext);
  if (!controls) throw new Error(OUTSIDE);
  return controls;
}

export interface PlayerProviderProps {
  episode: Episode;
  children: ReactNode;
}

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

  // These three read nothing from this render, so the list is empty and the
  // object is built once for the life of the provider. Anything they did read
  // would go in the list, and the identity would then change when that changed
  // rather than on every render. Module scope would do the same job here.
  const controls = useMemo<PlayerControls>(
    () => ({
      toggle: () => player.toggle(),
      skip: (seconds) => player.skip(seconds),
      seekTo: (seconds) => player.seekTo(seconds),
    }),
    []
  );

  // Slowest on the outside, fastest on the inside. That order is for reading:
  // what decides who redraws is which context a component subscribes to, not
  // where its provider sits.
  return (
    <EpisodeContext value={episode}>
      <ControlsContext value={controls}>
        <PlayingContext value={isPlaying}>
          <PositionContext value={positionSeconds}>{children}</PositionContext>
        </PlayingContext>
      </ControlsContext>
    </EpisodeContext>
  );
}
