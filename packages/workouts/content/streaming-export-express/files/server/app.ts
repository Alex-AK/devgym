import express, { type Express } from 'express';

import { createExportHandler } from './export';
import type { ResponseMeter } from './meter';
import type { Orders } from './orders';

/**
 * The service. One route, with the meter wrapped around it.
 *
 * Express's own ETag is off. It makes a tag by hashing the finished body, which
 * means having the finished body: leaving it on would put a reason to hold the
 * whole export in the scaffold, which is the one thing this endpoint must not
 * do.
 */
export function createApp(orders: Orders, meter: ResponseMeter): Express {
  const app = express();
  app.set('etag', false);
  app.disable('x-powered-by');

  app.use(meter.middleware());
  app.get('/exports/orders.csv', createExportHandler(orders));

  return app;
}
