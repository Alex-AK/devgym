import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type LoggedQuery, type Workspace } from '../../src/server/db';
import { buildOrdersReport } from '../../src/server/report';

const ORDERS = 60;
let workspace: Workspace;
/**
 * Taken before anything else runs. The log is shared, so a query this file makes
 * to check its own assumptions would otherwise look like one the report made.
 */
let reportQueries: LoggedQuery[];
let lineCount: number;

beforeAll(async () => {
  workspace = await createWorkspace({ orders: ORDERS });

  workspace.queries.length = 0;
  await buildOrdersReport(workspace);
  reportQueries = [...workspace.queries];

  const [row] = (await workspace.dataSource.query('SELECT COUNT(*) AS n FROM order_items')) as {
    n: number;
  }[];
  lineCount = Number(row?.n ?? 0);
}, 90_000);

afterAll(async () => {
  await workspace?.close();
});

describe('the counting and adding up happen in the database', () => {
  it('brings back a row per order, not a row per line', () => {
    const biggest = Math.max(...reportQueries.map((query) => query.rowCount));

    expect(lineCount, 'the fixture should have far more lines than orders').toBeGreaterThan(ORDERS);
    expect(
      biggest,
      `one query came back with ${biggest} rows for a ${ORDERS} row report`
    ).toBeLessThanOrEqual(ORDERS);
  });

  it('does not read the line items table into memory', () => {
    const bulkLineReads = reportQueries.filter(
      (query) => query.sql.includes('order_items') && query.rowCount > ORDERS
    );

    expect(
      bulkLineReads.length,
      'joining the lines in and reducing them in JavaScript is still shipping every line'
    ).toBe(0);
  });

  it('asks the database to do the arithmetic over the line items', () => {
    const aggregated = reportQueries.filter(
      (query) => /count\(|sum\(/i.test(query.sql) && query.sql.includes('order_items')
    );

    expect(aggregated.length, 'nothing counted or summed the line items in SQL').toBeGreaterThan(0);
  });
});
