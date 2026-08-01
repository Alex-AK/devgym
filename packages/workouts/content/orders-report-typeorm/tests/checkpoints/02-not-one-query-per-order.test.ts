import { afterEach, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { buildOrdersReport } from '../../src/server/report';

const open: Workspace[] = [];

afterEach(async () => {
  await Promise.all(open.splice(0).map((workspace) => workspace.close()));
});

/** How many statements the report costs for a database of this size. */
async function statementsFor(orders: number): Promise<number> {
  const workspace = await createWorkspace({ orders });
  open.push(workspace);

  workspace.queries.length = 0;
  await buildOrdersReport(workspace);
  return workspace.queries.length;
}

describe('the report does not cost a query per order', () => {
  it('costs the same for sixty orders as for five', async () => {
    const small = await statementsFor(5);
    const large = await statementsFor(60);

    expect(
      large,
      `5 orders took ${small} statements and 60 took ${large}, so the cost follows the data`
    ).toBe(small);
  }, 90_000);

  it('is a handful of statements, not one per row', async () => {
    const statements = await statementsFor(60);

    expect(statements, `${statements} statements for one report`).toBeLessThanOrEqual(3);
  }, 90_000);

  it('never asks for one order at a time', async () => {
    const workspace = await createWorkspace({ orders: 20 });
    open.push(workspace);

    workspace.queries.length = 0;
    await buildOrdersReport(workspace);

    const singleOrderLookups = workspace.queries.filter((query) => query.rowCount === 1);
    expect(
      singleOrderLookups.length,
      'the report is fetching rows one at a time'
    ).toBeLessThanOrEqual(1);
  }, 90_000);
});
