import type { Request, Response } from 'express';

import type { Order, Orders } from './orders';

const HEADER = 'id,placed_at,customer,region,units,total_pence\n';

/** RFC 4180: quote a field that holds a comma, a quote or a line break, and double its quotes. */
function field(value: number | string): string {
  const text = String(value);
  if (!/["\n\r,]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

function line(order: Order): string {
  const cells = [
    order.id,
    order.placedAt,
    order.customer,
    order.region,
    order.units,
    order.totalPence,
  ];
  return `${cells.map(field).join(',')}\n`;
}

/**
 * `GET /exports/orders.csv`.
 *
 * One row is built, written and dropped before the next one is asked for, so
 * the file exists in full in exactly one place: the client's disk.
 */
export function createExportHandler(orders: Orders) {
  return async function exportOrders(_req: Request, res: Response): Promise<void> {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="orders.csv"');

    if (!res.write(HEADER)) await drain(res);

    for (const order of orders.rows()) {
      // false does not mean the write failed: the row was accepted and queued,
      // and the response is telling you its buffer is full. Keep going and the
      // queue is where the whole export ends up. Stopping here is the fix.
      if (!res.write(line(order))) await drain(res);
    }

    res.end();
  };
}

/**
 * Wait for the response to flush what it is holding.
 *
 * Only ever called after a write returned false, because that is the only time
 * a drain is coming: waiting after a write that returned true parks the request
 * for good.
 */
function drain(res: Response): Promise<void> {
  return new Promise((resolve) => {
    res.once('drain', () => resolve());
  });
}
