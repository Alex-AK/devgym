import { EPISODE } from './episode';

type Listener = () => void;

/**
 * The audio element, faked.
 *
 * One of these exists per page, the way one `<audio>` does, and it is the only
 * thing that knows where the playhead is. React finds out by subscribing.
 *
 * `advance` is the part the real one does not have. In the browser the clock
 * moves on the audio element's `timeupdate` event, about four times a second
 * while something is playing, and while a scrubber is being dragged it moves as
 * fast as the pointer does. Here it moves when something calls `advance`, so a
 * test can decide when time passes. Nothing in `src/client` calls it.
 */
export interface PlayerEngine {
  readonly positionSeconds: number;
  readonly isPlaying: boolean;
  toggle(): void;
  /** Jump to a point in the episode. Clamped to the episode. */
  seekTo(seconds: number): void;
  /** The skip buttons: positive forwards, negative back. Clamped to the episode. */
  skip(seconds: number): void;
  /** Playback, driven by hand. */
  advance(seconds: number): void;
  subscribe(listener: Listener): () => void;
  /** Back to the start, paused. Subscribers are left alone. */
  reset(): void;
}

function createEngine(durationSeconds: number): PlayerEngine {
  const listeners = new Set<Listener>();
  let positionSeconds = 0;
  let isPlaying = false;

  const clamp = (seconds: number): number =>
    Math.min(durationSeconds, Math.max(0, Math.round(seconds)));

  const announce = (): void => {
    for (const listener of [...listeners]) listener();
  };

  return {
    get positionSeconds() {
      return positionSeconds;
    },
    get isPlaying() {
      return isPlaying;
    },
    toggle() {
      isPlaying = !isPlaying;
      announce();
    },
    seekTo(seconds) {
      positionSeconds = clamp(seconds);
      announce();
    },
    skip(seconds) {
      positionSeconds = clamp(positionSeconds + seconds);
      announce();
    },
    advance(seconds) {
      positionSeconds = clamp(positionSeconds + seconds);
      announce();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    reset() {
      positionSeconds = 0;
      isPlaying = false;
    },
  };
}

export const player = createEngine(EPISODE.durationSeconds);
