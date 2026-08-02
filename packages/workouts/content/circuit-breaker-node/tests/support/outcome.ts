export const PENDING = Symbol('pending');

/**
 * What a promise has done by now: its value, its error, or PENDING if it has
 * not settled yet. Checkpoints use this so a call that never gives up fails in
 * milliseconds with a useful message, rather than sitting out the suite timeout.
 */
export async function outcome<T>(promise: Promise<T>): Promise<T | Error | typeof PENDING> {
  return Promise.race([
    promise.then(
      (value) => value,
      (error: Error) => error
    ),
    ticks(3).then(() => PENDING),
  ]);
}

async function ticks(count: number): Promise<void> {
  for (let i = 0; i < count; i += 1) {
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });
  }
}
