import type { Workspace } from './db';

export interface OrderReportRow {
  orderId: number;
  reference: string;
  customerName: string;
  itemCount: number;
  totalCents: number;
}

interface RawRow {
  orderId: number | string;
  reference: string;
  customerName: string;
  itemCount: number | string;
  totalCents: number | string | null;
}

/**
 * The orders report, as one query.
 *
 * The counting and the adding up happen in the database, so what comes back is
 * one row per order rather than one row per line item. Loading every line and
 * reducing them in JavaScript would be a single query too, and still wrong: the
 * report is forty rows and it would be shipping thousands.
 */
export async function buildOrdersReport(workspace: Workspace): Promise<OrderReportRow[]> {
  const rows = await workspace.orders
    .createQueryBuilder('order')
    .innerJoin('order.customer', 'customer')
    // LEFT, not INNER: an order nobody ever added a line to still belongs on the
    // report, at zero. An inner join drops it silently.
    .leftJoin('order.items', 'item')
    .select('order.id', 'orderId')
    .addSelect('order.reference', 'reference')
    .addSelect('customer.name', 'customerName')
    .addSelect('COUNT(item.id)', 'itemCount')
    // COUNT of no rows is 0, but SUM of no rows is NULL.
    .addSelect('COALESCE(SUM(item.priceCents * item.quantity), 0)', 'totalCents')
    .groupBy('order.id')
    .orderBy('order.id', 'ASC')
    .getRawMany<RawRow>();

  return rows.map((row) => ({
    orderId: Number(row.orderId),
    reference: row.reference,
    customerName: row.customerName,
    itemCount: Number(row.itemCount),
    totalCents: Number(row.totalCents ?? 0),
  }));
}
