import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { listOrders } from '../../src/server/orders';

let workspace: Workspace;

beforeAll(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

async function statementCount(limit: number): Promise<number> {
  workspace.queries.length = 0;
  await listOrders(workspace.db, { status: 'pending', page: 1, limit });
  return workspace.queries.length;
}

describe('one query for the page, not one per row', () => {
  it('serves a page of 20 in a couple of statements', async () => {
    const count = await statementCount(20);

    expect(count, `a page of 20 took ${count} round trips`).toBeLessThanOrEqual(2);
  });

  it('does not get more expensive as the page gets bigger', async () => {
    const small = await statementCount(5);
    const large = await statementCount(50);

    expect(
      large,
      `5 rows took ${small} statements and 50 rows took ${large}: that is one query per row`
    ).toBe(small);
  });

  it('never queries the customers table once per order', async () => {
    workspace.queries.length = 0;
    await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });

    const customerQueries = workspace.queries.filter((statement) =>
      statement.sql.toLowerCase().includes('from "customers"')
    );

    expect(
      customerQueries.length,
      'the customer name should come back with the order'
    ).toBeLessThanOrEqual(1);
  });
});
