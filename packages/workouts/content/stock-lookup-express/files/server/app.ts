import express, { type Express } from 'express';

import {
  type CacheOptions,
  createAvailabilityHandler,
  createDeliveryHandler,
} from './availability';
import type { FakeRedis } from './fake-redis';
import type { Stock } from './stock';

/**
 * The service. Two routes, and the wiring around them.
 *
 * Express puts a weak ETag on anything sent through `res.json` and answers 304 to
 * a request whose `If-None-Match` matches it. That is left on: it saves the bytes
 * on the way back and none of the work on the way in, and the work is what this
 * workout is about. This file is wiring; the work is in availability.ts.
 */
export function createApp(stock: Stock, redis: FakeRedis, options: CacheOptions): Express {
  const app = express();
  app.use(express.json());

  app.get('/availability', createAvailabilityHandler(stock, redis, options));
  app.post('/deliveries', createDeliveryHandler(stock, redis));

  return app;
}
