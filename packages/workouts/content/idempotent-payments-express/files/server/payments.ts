import type { Request, Response } from 'express';

import type { Db } from './db';
import type { ChargeInput, FakeGateway } from './gateway';

/**
 * The handler behind POST /payments.
 *
 * TODO: make one payment cost one charge, however many times the client sends
 * it. See brief.md for the header, the five cases and the status codes.
 *
 * Right now every request that arrives charges the card.
 */
export function createPaymentsHandler(db: Db, gateway: FakeGateway) {
  void db;

  return async function payments(req: Request, res: Response): Promise<void> {
    const payment = req.body as ChargeInput;

    const charge = await gateway.charge(payment);

    res.status(201).json(charge);
  };
}
