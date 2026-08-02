# One recompute, not fifty

The dashboard report takes four seconds to build. Fifty people have the dashboard open, it refreshes
on a timer, and every one of those refreshes builds the report again. The database is doing fifty
times the work to produce fifty identical answers.

## The task

One file: **`src/lib/cache.ts`**. `Cache.get(key, compute)` answers from three places, in this
order.

**From memory**, if this key was computed less than `ttlMs` ago. The deadline is set when the
computation finished, and reading a value does not extend it.

**From the computation already running**, if one is. This is the part that matters: fifty callers
arriving for a cold key must produce one call to `compute` and fifty callers waiting on it, not
fifty calls. When it settles, the key is free again.

**From a new computation**, otherwise. Store the result and the deadline when it succeeds.

**A failure is not a value.** Everyone waiting on a failed computation gets the error, nothing is
stored, and the next caller starts a fresh attempt rather than joining the dead one. A value that
was already cached under a different key stays where it is.

## What you are given

**`src/lib/clock.ts`** is a clock the checkpoints drive. `now()` reads it and nothing moves it
except a checkpoint calling `advance()`, so a thirty-second TTL expires instantly. Read the time
from it rather than from `Date.now()`, which the checkpoints cannot move.

## Notes

`get` is `async`, which means every `await` inside it is a place where fifty other callers can run.
The check for an existing computation and the decision to start one have to happen in the same
synchronous stretch, or all fifty will find the map empty before any of them fills it.

Nothing is imported from outside these two files, and nothing needs to be. `npm`-style commands are
not available: hit **Run checkpoints** to see where you are.

## If you finish early

- An expired key still stops the world for four seconds while one caller rebuilds it. Serve the
  stale value to everyone and refresh in the background, then decide how stale is too stale.
- Nothing here ever evicts. Add a size limit and work out what your eviction policy costs you on a
  key that is expensive to build and rarely read.
- This cache lives in one process. Work out which of these four behaviours survives moving it to
  Redis and which one quietly stops being true across three machines.
