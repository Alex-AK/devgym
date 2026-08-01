import type { Kysely } from 'kysely';

import type { Database, OrderListResult } from './types';

export interface ListOrdersQuery {
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * The orders list. Filtering, ordering, paging and the customer name are all one
 * query now, plus a second for the count.
 */
export async function listOrders(
  db: Kysely<Database>,
  query: ListOrdersQuery = {}
): Promise<OrderListResult> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 20)));

  // One base to hang both the page and the count off, so the filter cannot drift
  // between them.
  const base = query.status
    ? db.selectFrom('orders').where('orders.status', '=', query.status)
    : db.selectFrom('orders');

  const rows = await base
    .innerJoin('customers', 'customers.id', 'orders.customer_id')
    .select([
      'orders.id as id',
      'orders.status as status',
      'orders.total_cents as total_cents',
      'orders.created_at as created_at',
      'customers.name as customer_name',
    ])
    .orderBy('orders.created_at', 'desc')
    .limit(limit)
    .offset((page - 1) * limit)
    .execute();

  const counted = await base.select((eb) => eb.fn.countAll().as('total')).executeTakeFirst();

  return {
    items: rows.map((row) => ({
      id: row.id,
      status: row.status,
      totalCents: row.total_cents,
      createdAt: row.created_at,
      customerName: row.customer_name,
    })),
    // Postgres counts in bigint, which arrives as a string.
    total: Number(counted?.total ?? 0),
    page,
    limit,
  };
}
