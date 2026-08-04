import type { Request, Response } from 'express';
import { z } from 'zod';

import { ORDER_STATUSES, type OrderStatus, type Orders } from './orders';

/**
 * What a valid query looks like. The status filter is the only part of it
 * described here so far.
 *
 * TODO: make this the whole shape, and the only place a query is described.
 * See brief.md.
 */
export const listQuerySchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});

/**
 * What the endpoint hands the listing.
 *
 * TODO: this describes a query a second time, and nothing keeps the two in
 * step.
 */
interface ListQuery {
  page: number;
  perPage: number;
  status?: OrderStatus;
  sort: 'newest' | 'oldest';
  includeArchived: boolean;
}

/**
 * `GET /orders`.
 *
 * TODO: nothing should reach `orders.list` until it has been checked, and a
 * caller who sends something this endpoint cannot use has to be told which
 * field it was. See brief.md.
 */
export function createListOrders(orders: Orders) {
  return function listOrders(req: Request, res: Response): void {
    const checked = listQuerySchema.safeParse(req.query);
    if (!checked.success) {
      res.status(400).json({ error: 'Bad Request' });
      return;
    }

    const query = { ...req.query } as unknown as ListQuery;
    query.page ??= 1;
    query.perPage ??= 20;
    query.sort ??= 'newest';
    query.includeArchived ??= false;

    res.json(orders.list(query));
  };
}
