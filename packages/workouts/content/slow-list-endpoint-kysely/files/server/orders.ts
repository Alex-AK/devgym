import type { Kysely } from 'kysely';

import type { Database, OrderListItem, OrderListResult } from './types';

export interface ListOrdersQuery {
  status?: string;
  page?: number;
  limit?: number;
}

/**
 * The orders list. It was written when the table had a few hundred rows in it
 * and nobody has looked at it since.
 */
export async function listOrders(
  db: Kysely<Database>,
  query: ListOrdersQuery = {}
): Promise<OrderListResult> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 20)));

  const all = await db.selectFrom('orders').selectAll().execute();

  const matching = query.status ? all.filter((order) => order.status === query.status) : all;
  matching.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const start = (page - 1) * limit;
  const wanted = matching.slice(start, start + limit);

  const items: OrderListItem[] = [];
  for (const order of wanted) {
    const customer = await db
      .selectFrom('customers')
      .select('name')
      .where('id', '=', order.customer_id)
      .executeTakeFirst();

    items.push({
      id: order.id,
      status: order.status,
      totalCents: order.total_cents,
      createdAt: order.created_at,
      customerName: customer?.name ?? 'Unknown',
    });
  }

  return { items, total: matching.length, page, limit };
}
