import type { Workspace } from './db';

export interface OrderReportRow {
  orderId: number;
  reference: string;
  customerName: string;
  itemCount: number;
  totalCents: number;
}

/**
 * The orders report. One row per order, with who it is for and what it came to.
 *
 * It was written against a test database with a dozen orders in it. Nobody
 * noticed until the report went to a customer with four thousand.
 */
export async function buildOrdersReport(workspace: Workspace): Promise<OrderReportRow[]> {
  const orders = await workspace.orders.find({ order: { id: 'ASC' } });

  const report: OrderReportRow[] = [];
  for (const order of orders) {
    // Who is it for?
    const withCustomer = await workspace.orders.findOne({
      where: { id: order.id },
      relations: { customer: true },
    });

    // What is on it?
    const lines = await workspace.items.find({ where: { order: { id: order.id } } });

    report.push({
      orderId: order.id,
      reference: order.reference,
      customerName: withCustomer?.customer.name ?? 'Unknown',
      itemCount: lines.length,
      totalCents: lines.reduce((sum, line) => sum + line.priceCents * line.quantity, 0),
    });
  }

  return report;
}
