import { accessSync, constants, statSync } from 'node:fs';
import { createConnection } from 'node:net';
import { delimiter, join } from 'node:path';

import type { UnmetRequirement, WorkoutRequirement } from '@hone/shared';

/**
 * What a workout needs that this repo does not ship, and whether this machine
 * has it. The whole point is graceful absence: one workout that wants Postgres
 * must not turn `pnpm verify` red for somebody who has never installed it, so
 * every caller asks here first and skips rather than fails.
 *
 * A requirement names a binary, a port, or both. Both questions are asked when
 * both are named, and each stands on its own otherwise: a daemon is reached
 * over a socket, and something serving that socket from a container or an app
 * bundle is exactly as usable as one Homebrew put on `PATH`.
 *
 * The check is deliberately shallow. It answers "could this run", not "will it
 * work": a Postgres of the wrong major version passes, and the workout's own
 * suites are what discover that. Anything deeper would need the daemon's
 * protocol, and a wrong answer here is worse than a checkpoint failure, because
 * it is the answer that decides whether a checkpoint runs at all.
 */

/** Long enough for a daemon on loopback, short enough not to stall a page load. */
const PORT_TIMEOUT_MS = 500;

/** Loopback only. Reaching another host would be the network. */
const HOST = '127.0.0.1';

/**
 * The requirements this machine does not meet, in declaration order. Empty for
 * the workouts that declare nothing, which is nearly all of them.
 */
export async function unmetRequirements(
  requires: WorkoutRequirement[] | undefined
): Promise<UnmetRequirement[]> {
  const unmet: UnmetRequirement[] = [];

  for (const requirement of requires ?? []) {
    if (requirement.binary !== undefined && !onPath(requirement.binary)) {
      unmet.push(describe(requirement, 'not-installed'));
      continue;
    }
    // Installed and not running is the common case, and it is a different
    // sentence: nothing to install, something to start.
    if (requirement.port !== undefined && !(await answers(requirement.port))) {
      unmet.push(describe(requirement, 'not-running'));
    }
  }

  return unmet;
}

/**
 * The first thing missing, phrased for a skip message. A run stops at the first
 * one because the reader can only fix one at a time anyway.
 */
export function skipReason(unmet: UnmetRequirement[]): string | null {
  return unmet[0]?.message ?? null;
}

function describe(
  requirement: WorkoutRequirement,
  state: UnmetRequirement['state']
): UnmetRequirement {
  const { binary, install, port, reason } = requirement;

  return {
    ...(binary !== undefined ? { binary } : {}),
    ...(port !== undefined ? { port } : {}),
    state,
    message: sentence(binary, port, state, install),
    install,
    reason,
  };
}

/**
 * Three sentences, because there are three ways to be short of something and
 * the reader can only act on the one they are in. The third exists because a
 * requirement may name a port alone, and telling somebody whose Postgres runs
 * in a container that it is not on their `PATH` would send them to install a
 * second copy of what they already have.
 */
function sentence(
  binary: string | undefined,
  port: number | undefined,
  state: UnmetRequirement['state'],
  install: string
): string {
  // A requirement naming no binary can only be short one way, and the install
  // line is the only thing there is to say, so it goes in the sentence.
  if (binary === undefined) {
    return `This workout needs something listening on ${HOST}:${String(port)}, and nothing is. Start it: ${install}`;
  }
  if (state === 'not-installed') {
    return `This workout needs ${binary}, which is not on your PATH. Install it: ${install}`;
  }
  return `${binary} is installed, but nothing is listening on ${HOST}:${String(port)}. Start it and run this again.`;
}

/**
 * `PATH` scanned by hand rather than shelled out to `which`, so the check costs
 * a few stats instead of a process, and so it says the same thing on a machine
 * whose shell has its own idea of what is installed.
 */
function onPath(binary: string): boolean {
  for (const dir of (process.env.PATH ?? '').split(delimiter)) {
    if (!dir) continue;
    const candidate = join(dir, binary);
    try {
      // A directory can be executable too, and `postgres/` on the path is not a
      // Postgres.
      if (!statSync(candidate).isFile()) continue;
      accessSync(candidate, constants.X_OK);
      return true;
    } catch {
      // Not here, or not runnable by us. Next entry.
    }
  }
  return false;
}

function answers(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ port, host: HOST });
    const settle = (reachable: boolean): void => {
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(PORT_TIMEOUT_MS);
    socket.once('connect', () => settle(true));
    socket.once('timeout', () => settle(false));
    socket.once('error', () => settle(false));
  });
}
