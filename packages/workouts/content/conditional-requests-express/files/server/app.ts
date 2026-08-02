import express, { type Express } from 'express';

import { createReportHandler } from './report';
import type { Sales } from './sales';

/**
 * The service. One endpoint, and the wiring around it.
 *
 * Express fills in an ETag of its own for anything sent through `res.json`. It is
 * off here, so the only validator on the response is the one the handler sets.
 */
export function createApp(sales: Sales): Express {
  const app = express();
  app.set('etag', false);

  app.get('/report', createReportHandler(sales));

  return app;
}
