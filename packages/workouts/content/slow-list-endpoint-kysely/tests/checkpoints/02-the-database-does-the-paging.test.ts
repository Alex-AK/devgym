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

/** Run one request and hand back only the statements it caused. */
async function statementsFor(query: Parameters<typeof listOrders>[1]) {
  workspace.queries.length = 0;
  await listOrders(workspace.db, query);
  return [...workspace.queries];
}

describe('the database does the filtering and the paging', () => {
  it('never drags more rows out than the page holds', async () => {
    const statements = await statementsFor({ status: 'pending', page: 1, limit: 20 });
    const biggest = Math.max(...statements.map((statement) => statement.rowCount));

    expect(
      biggest,
      `one query came back with ${biggest} rows for a page of 20`
    ).toBeLessThanOrEqual(20);
  });

  it('asks Postgres for the slice, so the limit is in the SQL', async () => {
    const statements = await statementsFor({ status: 'pending', page: 1, limit: 20 });
    const sql = statements.map((statement) => statement.sql.toLowerCase());

    expect(sql.some((text) => text.includes('limit'))).toBe(true);
  });

  it('sends the status to Postgres rather than filtering afterwards', async () => {
    const statements = await statementsFor({ status: 'pending', page: 1, limit: 20 });
    const filtered = statements.filter(
      (statement) =>
        statement.sql.toLowerCase().includes('where') && statement.parameters.includes('pending')
    );

    expect(filtered.length, 'no query mentioned the status being asked for').toBeGreaterThan(0);
  });

  it('costs the same to read page 40 as page 1', async () => {
    const first = await statementsFor({ status: 'pending', page: 1, limit: 5 });
    const later = await statementsFor({ status: 'pending', page: 40, limit: 5 });

    const rowsFor = (statements: typeof first) =>
      statements.reduce((sum, statement) => sum + statement.rowCount, 0);

    expect(rowsFor(later)).toBeLessThanOrEqual(rowsFor(first) + 5);
  });

  it('gets the total from a count rather than by measuring an array', async () => {
    const statements = await statementsFor({ status: 'pending', page: 1, limit: 20 });

    expect(statements.some((statement) => statement.sql.toLowerCase().includes('count'))).toBe(
      true
    );
  });
});
