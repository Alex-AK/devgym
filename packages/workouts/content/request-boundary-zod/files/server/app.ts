import express, { type Express } from 'express';

import { createListOrders } from './list-orders';
import type { Orders } from './orders';

/**
 * The service. One endpoint, and the wiring around it.
 *
 * Two things are deliberate here. The query parser is pinned rather than left
 * to the default, so the endpoint sees the same shapes in a checkpoint as it
 * does in production. And there is no `express.json()`: nothing on this service
 * reads a body, and body-parser answers a malformed one with a 400 of its own,
 * which is not the 400 this endpoint owes anybody.
 *
 * The default error handler is left alone, and it is worth knowing what it
 * does: an error thrown out of a handler becomes a 500 with an HTML body.
 */
export function createApp(orders: Orders): Express {
  const app = express();
  app.set('query parser', 'simple');

  app.get('/orders', createListOrders(orders));

  return app;
}
