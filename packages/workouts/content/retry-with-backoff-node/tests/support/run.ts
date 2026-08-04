import type { Clock } from '../../src/lib/clock';

export const PENDING = Symbol('pending');

/**
 * What the client did, with the clock moved along for it. `drain` jumps to
 * every deadline and every wait the client asked for, in order, so a checkpoint
 * never has to know how long it decided to sleep. PENDING comes back when the
 * call was still waiting on something after all of them, which is a client that
 * never gives up: it fails in milliseconds rather than sitting out the timeout.
 */
export async function complete<T>(
  promise: Promise<T>,
  clock: Clock
): Promise<T | Error | typeof PENDING> {
  const settled = promise.then(
    (value) => value,
    (error: Error) => error
  );
  await clock.drain();
  return Promise.race([settled, ticks(3).then(() => PENDING)]);
}

/** A random that hands back the numbers you give it, then repeats the last. */
export function randoms(...values: number[]): () => number {
  let index = 0;
  return () => {
    const value = values[Math.min(index, values.length - 1)] ?? 0;
    index += 1;
    return value;
  };
}

async function ticks(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}
