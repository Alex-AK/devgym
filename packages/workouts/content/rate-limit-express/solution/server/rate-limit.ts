import type { NextFunction, Request, Response } from 'express';

import type { FakeRedis } from './fake-redis';

export interface RateLimitOptions {
  /** How many requests one client gets per window. */
  limit: number;
  /** How long a window lasts, in seconds. */
  windowSeconds: number;
}

/** An API key if there is one, otherwise whoever the socket says they are. */
function clientOf(req: Request): string {
  const apiKey = req.header('x-api-key')?.trim();
  return apiKey || req.ip || 'unknown';
}

export function createRateLimit(redis: FakeRedis, options: RateLimitOptions) {
  const { limit, windowSeconds } = options;

  return async function rateLimit(req: Request, res: Response, next: NextFunction): Promise<void> {
    const key = `ratelimit:${clientOf(req)}`;

    const used = await redis.incr(key);
    // Only the request that created the counter sets the deadline. Calling
    // expire on every request pushes the window out each time, so a client with
    // steady traffic never gets back in.
    if (used === 1) await redis.expire(key, windowSeconds);

    const ttl = await redis.ttl(key);
    const resetIn = ttl >= 0 ? ttl : windowSeconds;

    res.setHeader('RateLimit-Limit', String(limit));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - used)));
    res.setHeader('RateLimit-Reset', String(resetIn));

    if (used > limit) {
      // Never zero: telling a client to retry in no time at all is telling it
      // to hammer you.
      res.setHeader('Retry-After', String(Math.max(1, resetIn)));
      res.status(429).json({ error: 'Too many requests' });
      return;
    }

    next();
  };
}
