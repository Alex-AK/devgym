import type { Request, Response } from 'express';

import type { FakeRedis } from './fake-redis';
import type { Stock } from './stock';

export interface CacheOptions {
  /** How long a stored answer is allowed to stand, in seconds. */
  ttlSeconds: number;
}

/** A parameter arrives as a string, as several of them, or not at all. */
function asString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * `GET /availability?branch=leeds&sku=DRILL-03`.
 *
 * How many of one item are on the shelf at one branch. Right now it adds the
 * branch up from the movements on every request.
 *
 * TODO: answer from Redis when this lookup has been made recently, and count the
 * stock only when it has not. See brief.md.
 */
export function createAvailabilityHandler(stock: Stock, redis: FakeRedis, options: CacheOptions) {
  void redis;
  void options;

  return async function availability(req: Request, res: Response): Promise<void> {
    const branch = asString(req.query.branch);
    const sku = asString(req.query.sku);
    if (!branch || !sku) {
      res.status(400).json({ error: 'branch and sku are both required' });
      return;
    }

    res.json({ branch, sku, units: stock.countUnits(branch, sku) });
  };
}

/**
 * `POST /deliveries` with `{ branch, sku, units }`.
 *
 * A van arrives and the shelf has more on it than it did.
 *
 * TODO: anything stored for that branch and that item is now wrong. See brief.md.
 */
export function createDeliveryHandler(stock: Stock, redis: FakeRedis) {
  void redis;

  return async function delivery(req: Request, res: Response): Promise<void> {
    const body = req.body as { branch?: unknown; sku?: unknown; units?: unknown };
    const branch = asString(body.branch);
    const sku = asString(body.sku);
    const units = typeof body.units === 'number' && body.units > 0 ? body.units : null;
    if (!branch || !sku || units === null) {
      res.status(400).json({ error: 'branch, sku and a positive units are all required' });
      return;
    }

    stock.recordDelivery(branch, sku, units);

    res.status(201).json({ recorded: true });
  };
}
