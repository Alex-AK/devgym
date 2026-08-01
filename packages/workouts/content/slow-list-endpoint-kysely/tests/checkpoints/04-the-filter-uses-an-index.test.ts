import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type LoggedQuery, type Workspace } from '../../src/server/db';
import { listOrders } from '../../src/server/orders';

let workspace: Workspace;
let plan: string;

/**
 * Ask Postgres what it did with the query the endpoint actually ran. This is the
 * only honest way to check an index: the index existing proves nothing, the
 * planner choosing it is the thing.
 */
async function explain(statement: LoggedQuery): Promise<string> {
  const result = await workspace.client.query<{ 'QUERY PLAN': string }>(
    `EXPLAIN ${statement.sql}`,
    [...statement.parameters]
  );
  return result.rows.map((row) => row['QUERY PLAN']).join('\n');
}

beforeAll(async () => {
  workspace = await createWorkspace();

  workspace.queries.length = 0;
  await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });

  const againstOrders = workspace.queries.filter((statement) =>
    statement.sql.toLowerCase().includes('from "orders"')
  );
  // The one that fetches the page, or whatever it ran instead.
  const page =
    againstOrders.find((statement) => statement.sql.toLowerCase().includes('limit')) ??
    againstOrders[0];

  plan = page ? await explain(page) : 'no query was run against orders';
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

describe('the filter uses an index', () => {
  it('does not read the whole orders table', async () => {
    expect(plan, `the planner chose:\n${plan}`).not.toContain('Seq Scan on orders');
  });

  it('finds the matching rows through an index', async () => {
    expect(plan, `the planner chose:\n${plan}`).toMatch(/Index (Only )?Scan|Bitmap Index Scan/);
  });

  it('gets them back in order rather than sorting them afterwards', async () => {
    // An index on status alone still leaves the planner sorting by created_at.
    // One that carries both gives the rows up already ordered.
    expect(plan, `the planner chose:\n${plan}`).not.toContain('Sort');
  });
});
