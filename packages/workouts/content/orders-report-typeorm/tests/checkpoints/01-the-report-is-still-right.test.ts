import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { buildOrdersReport, type OrderReportRow } from '../../src/server/report';

let workspace: Workspace;
let report: OrderReportRow[];

beforeAll(async () => {
  workspace = await createWorkspace({ orders: 20 });
  report = await buildOrdersReport(workspace);
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

/** The same figures, straight from SQL, with none of the report's code involved. */
async function truth() {
  return (await workspace.dataSource.query(`
    SELECT o.id AS orderId,
           o.reference AS reference,
           c.name AS customerName,
           COUNT(i.id) AS itemCount,
           COALESCE(SUM(i.priceCents * i.quantity), 0) AS totalCents
    FROM orders o
    JOIN customers c ON c.id = o.customerId
    LEFT JOIN order_items i ON i.orderId = o.id
    GROUP BY o.id
    ORDER BY o.id ASC
  `)) as Record<string, string | number>[];
}

describe('the report is still right', () => {
  it('has a row for every order', async () => {
    expect(report).toHaveLength((await truth()).length);
  });

  it('names the right customer on each row', async () => {
    const expected = new Map((await truth()).map((row) => [Number(row.orderId), row.customerName]));

    for (const row of report) {
      expect(row.customerName, `order ${row.orderId}`).toBe(expected.get(row.orderId));
    }
  });

  it('counts the lines on each order', async () => {
    const expected = new Map(
      (await truth()).map((row) => [Number(row.orderId), Number(row.itemCount)])
    );

    for (const row of report) {
      expect(row.itemCount, `order ${row.orderId}`).toBe(expected.get(row.orderId));
    }
  });

  it('adds the money up the same way', async () => {
    const expected = new Map(
      (await truth()).map((row) => [Number(row.orderId), Number(row.totalCents)])
    );

    for (const row of report) {
      expect(row.totalCents, `order ${row.orderId}`).toBe(expected.get(row.orderId));
    }
  });

  it('keeps the rows in order', () => {
    const ids = report.map((row) => row.orderId);
    expect(ids).toEqual([...ids].sort((a, b) => a - b));
  });

  it('carries the reference through', () => {
    expect(report.every((row) => /^ORD-\d{4}$/.test(row.reference))).toBe(true);
  });
});
