import type { Request, Response } from 'express';

import type { Orders } from './orders';

/**
 * `GET /exports/orders.csv`.
 *
 * It walks the cursor, builds the file, and sends it. Which was fine while the
 * biggest account had nine thousand orders.
 *
 * TODO: send the same file without needing room for all of it at once, and send
 * it as a download. See brief.md.
 */
export function createExportHandler(orders: Orders) {
  return function exportOrders(_req: Request, res: Response): void {
    let csv = 'id,placed_at,customer,region,units,total_pence\n';

    for (const order of orders.rows()) {
      csv += `${order.id},${order.placedAt},${order.customer},${order.region},${order.units},${order.totalPence}\n`;
    }

    res.end(csv);
  };
}
