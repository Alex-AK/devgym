import type { Request, Response } from 'express';
import { z } from 'zod';

import { ORDER_STATUSES, type Orders } from './orders';

/**
 * A query, and the only place one is described.
 *
 * Everything on a query string arrives as a string, so the numbers and the
 * boolean are parsed rather than asserted. `z.coerce.boolean()` is the wrong
 * tool for the last one: it is `Boolean(value)`, and `Boolean('false')` is
 * true. `z.stringbool()` reads the string it was actually sent.
 */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
  status: z.enum(ORDER_STATUSES).optional(),
  sort: z.enum(['newest', 'oldest']).default('newest'),
  includeArchived: z.stringbool().default(false),
});

/** Read off the schema, so there is no second description to keep in step. */
export type ListQuery = z.infer<typeof listQuerySchema>;

export function createListOrders(orders: Orders) {
  return function listOrders(req: Request, res: Response): void {
    const checked = listQuerySchema.safeParse(req.query);

    if (!checked.success) {
      // Every issue, not the first one: a client fixing one field at a time
      // needs a round trip per mistake, and can only ever show what it was
      // told. `path` is an array because a schema can nest; here it is one
      // parameter name deep.
      res.status(400).json({
        error: 'invalid_query',
        issues: checked.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message,
        })),
      });
      return;
    }

    // Coerced, defaulted, and carrying nothing the schema did not ask for.
    const query: ListQuery = checked.data;
    res.json(orders.list(query));
  };
}
