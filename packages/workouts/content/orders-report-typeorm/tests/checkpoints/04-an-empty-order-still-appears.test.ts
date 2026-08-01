import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { buildOrdersReport, type OrderReportRow } from '../../src/server/report';

const ORDERS = 20;
let workspace: Workspace;
let report: OrderReportRow[];

beforeAll(async () => {
  workspace = await createWorkspace({ orders: ORDERS });
  report = await buildOrdersReport(workspace);
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

/** The fixture leaves the last order with nothing on it. */
async function emptyOrderId(): Promise<number> {
  const [row] = (await workspace.dataSource.query(`
    SELECT o.id AS id FROM orders o
    LEFT JOIN order_items i ON i.orderId = o.id
    WHERE i.id IS NULL
  `)) as { id: number }[];
  return Number(row?.id);
}

describe('an order with nothing on it still appears', () => {
  it('the fixture really does have one', async () => {
    expect(Number.isFinite(await emptyOrderId())).toBe(true);
  });

  it('keeps it on the report', async () => {
    const id = await emptyOrderId();

    expect(
      report.find((row) => row.orderId === id),
      'an inner join to the line items drops orders that have none'
    ).toBeDefined();
  });

  it('shows it as zero rather than nothing', async () => {
    const id = await emptyOrderId();
    const row = report.find((entry) => entry.orderId === id);

    expect(row?.itemCount).toBe(0);
    // SUM over no rows is NULL, and NULL reaches the UI as blank or NaN.
    expect(row?.totalCents).toBe(0);
  });

  it('still names its customer', async () => {
    const id = await emptyOrderId();
    const row = report.find((entry) => entry.orderId === id);

    expect(row?.customerName).toMatch(/^Customer \d+$/);
  });

  it('has every order on the report', () => {
    expect(report).toHaveLength(ORDERS);
  });
});
