import type { Orders } from '../../src/server/orders';

/**
 * The file the endpoint is supposed to produce, built here so a checkpoint can
 * compare against it line by line rather than shrugging at a megabyte of diff.
 */

export const HEADER = 'id,placed_at,customer,region,units,total_pence';

function field(value: number | string): string {
  const text = String(value);
  if (!/["\n\r,]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

/** The header row, then one line per order. No trailing empty line. */
export function expectedLines(orders: Orders): string[] {
  const lines = [HEADER];
  for (const order of orders.rows()) {
    lines.push(
      [order.id, order.placedAt, order.customer, order.region, order.units, order.totalPence]
        .map(field)
        .join(',')
    );
  }
  return lines;
}

export function expectedCsv(orders: Orders): string {
  return `${expectedLines(orders).join('\n')}\n`;
}

/** Bytes, said in a way a failure message can be read at a glance. */
export function kib(bytes: number): string {
  return `${Math.round(bytes / 1024).toLocaleString('en-GB')} KiB`;
}
