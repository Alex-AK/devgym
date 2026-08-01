import type { NextFunction, Request, Response } from 'express';

import type { FakeRedis } from './fake-redis';

export interface RateLimitOptions {
  /** How many requests one client gets per window. */
  limit: number;
  /** How long a window lasts, in seconds. */
  windowSeconds: number;
}

/**
 * Build the middleware that guards a route.
 *
 * TODO: count each client's requests in Redis, let them through while they are
 * under the limit, and answer 429 once they are over it. See brief.md for the
 * headers and for which client a request belongs to.
 *
 * Right now it waves everything through.
 */
export function createRateLimit(redis: FakeRedis, options: RateLimitOptions) {
  void redis;
  void options;

  return async function rateLimit(
    _req: Request,
    _res: Response,
    next: NextFunction
  ): Promise<void> {
    next();
  };
}
