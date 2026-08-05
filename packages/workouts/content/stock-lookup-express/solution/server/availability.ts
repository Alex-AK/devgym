import type { Request, Response } from 'express';

import type { FakeRedis } from './fake-redis';
import type { Stock, StockLevel } from './stock';

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
 * The key, in one place, because both handlers have to agree on it.
 *
 * The read builds it from the query it was asked and the write from the delivery
 * it recorded. If those two ever disagree, the write clears a key nobody reads
 * and the shelf count stays wrong until the deadline runs out.
 */
function availabilityKey(branch: string, sku: string): string {
  return `availability:${branch}:${sku}`;
}

/**
 * `GET /availability?branch=leeds&sku=DRILL-03`.
 *
 * Cache-aside: Redis first, count only on a miss, and store what you counted
 * before answering.
 */
export function createAvailabilityHandler(stock: Stock, redis: FakeRedis, options: CacheOptions) {
  return async function availability(req: Request, res: Response): Promise<void> {
    const branch = asString(req.query.branch);
    const sku = asString(req.query.sku);
    if (!branch || !sku) {
      res.status(400).json({ error: 'branch and sku are both required' });
      return;
    }

    const key = availabilityKey(branch, sku);

    const stored = await redis.get(key);
    if (stored !== null) {
      res.json(JSON.parse(stored) as StockLevel);
      return;
    }

    const level: StockLevel = { branch, sku, units: stock.countUnits(branch, sku) };
    // The deadline is the backstop for everything that moves stock without ever
    // reaching this service: the tills, and the overnight recount.
    await redis.set(key, JSON.stringify(level), options.ttlSeconds);

    res.json(level);
  };
}

/**
 * `POST /deliveries` with `{ branch, sku, units }`.
 *
 * The write half of cache-aside: record the delivery, then drop the one entry
 * that is now wrong.
 */
export function createDeliveryHandler(stock: Stock, redis: FakeRedis) {
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
    // One key: the one whose answer just changed. Clearing the lot would throw
    // away every branch's count to fix one item at one of them.
    await redis.del(availabilityKey(branch, sku));

    res.status(201).json({ recorded: true });
  };
}
