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

/** The truth, straight from Postgres, with none of the endpoint's code involved. */
async function pendingCount(): Promise<number> {
  const result = await workspace.client.query<{ n: number }>(
    "SELECT count(*)::int AS n FROM orders WHERE status = 'pending'"
  );
  return result.rows[0]?.n ?? 0;
}

describe('the page is still right', () => {
  it('returns a full page of the status that was asked for', async () => {
    const result = await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });

    expect(result.items).toHaveLength(20);
    expect(result.items.every((item) => item.status === 'pending')).toBe(true);
  });

  it('reports the total number of matches, not the size of the page', async () => {
    const result = await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });
    expect(result.total).toBe(await pendingCount());
  });

  it('still hands back the newest orders first', async () => {
    const result = await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });
    const times = result.items.map((item) => new Date(item.createdAt).getTime());

    expect(times).toEqual([...times].sort((a, b) => b - a));
  });

  it('carries on from where page 1 stopped', async () => {
    const first = await listOrders(workspace.db, { status: 'pending', page: 1, limit: 20 });
    const second = await listOrders(workspace.db, { status: 'pending', page: 2, limit: 20 });

    const overlap = second.items.filter((item) => first.items.some((seen) => seen.id === item.id));
    expect(overlap, 'page 2 repeats rows from page 1').toEqual([]);

    const oldestOnPageOne = Math.min(...first.items.map((i) => new Date(i.createdAt).getTime()));
    const newestOnPageTwo = Math.max(...second.items.map((i) => new Date(i.createdAt).getTime()));
    expect(newestOnPageTwo).toBeLessThanOrEqual(oldestOnPageOne);
  });

  it('names the customer each order belongs to', async () => {
    const result = await listOrders(workspace.db, { status: 'pending', page: 1, limit: 5 });
    const expected = await workspace.client.query<{ id: number; name: string }>(
      `SELECT o.id, c.name
       FROM orders o JOIN customers c ON c.id = o.customer_id
       WHERE o.id = ANY($1::int[])`,
      [result.items.map((item) => item.id)]
    );

    const byId = new Map(expected.rows.map((row) => [row.id, row.name]));
    for (const item of result.items) {
      expect(item.customerName).toBe(byId.get(item.id));
    }
  });

  it('works with no status filter at all', async () => {
    const result = await listOrders(workspace.db, { page: 1, limit: 10 });

    expect(result.items).toHaveLength(10);
    expect(result.total).toBe(40_000);
  });
});
