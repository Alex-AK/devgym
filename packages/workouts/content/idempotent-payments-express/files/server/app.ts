import express, { type Express } from 'express';

import type { Db } from './db';
import type { FakeGateway } from './gateway';
import { createPaymentsHandler } from './payments';

/**
 * The service. One endpoint, and it moves money.
 * This file is wiring; the work is in payments.ts.
 */
export function createApp(db: Db, gateway: FakeGateway): Express {
  const app = express();
  app.use(express.json());

  app.post('/payments', createPaymentsHandler(db, gateway));

  return app;
}
