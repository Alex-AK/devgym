import express, { type Express } from 'express';

import type { FakeRedis } from './fake-redis';
import { createRateLimit, type RateLimitOptions } from './rate-limit';

/**
 * The service. One endpoint worth protecting, with the limiter in front of it.
 * This file is wiring; the work is in rate-limit.ts.
 */
export function createApp(redis: FakeRedis, options: RateLimitOptions): Express {
  const app = express();
  app.use(express.json());

  // Counted so a checkpoint can tell whether a blocked request reached the
  // handler. Express hides that from the client: once the 429 has gone out, a
  // second response is dropped and the caller sees no difference.
  app.locals.handled = 0;

  app.post('/messages', createRateLimit(redis, options), (_req, res) => {
    app.locals.handled += 1;
    res.status(201).json({ sent: true });
  });

  return app;
}
