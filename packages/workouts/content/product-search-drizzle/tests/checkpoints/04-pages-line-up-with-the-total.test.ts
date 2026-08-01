import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { searchProducts } from '../../src/server/products';

const CATALOGUE_SIZE = 60;
let workspace: Workspace;

beforeAll(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

/** Every page, in order, for a given page size. */
async function walk(limit: number, q?: string) {
  const first = await searchProducts(workspace, { q, page: 1, limit });
  const pages = [first.items];

  for (let page = 2; page <= Math.ceil(first.total / limit); page += 1) {
    const next = await searchProducts(workspace, { q, page, limit });
    pages.push(next.items);
  }

  return { total: first.total, pages, ids: pages.flat().map((item) => item.id) };
}

describe('the pages line up with the total', () => {
  it('reports how many matched, not how many are on the page', async () => {
    const result = await searchProducts(workspace, { page: 1, limit: 7 });

    expect(result.items).toHaveLength(7);
    expect(result.total).toBe(CATALOGUE_SIZE);
  });

  it('walks the whole catalogue without repeating or losing a row', async () => {
    const { total, ids } = await walk(7);

    expect(ids).toHaveLength(total);
    expect(new Set(ids).size, 'some rows came back on more than one page').toBe(total);
  });

  it('hands the pages back in the order Postgres would', async () => {
    const { ids } = await walk(7);
    const expected = await workspace.client.query<{ id: number }>(
      'SELECT id FROM products ORDER BY name, id'
    );

    expect(ids).toEqual(expected.rows.map((row) => row.id));
  });

  it('breaks ties, because twelve products share a name', async () => {
    // Twelve rows named "Refill pack". Ordering by name alone leaves their order
    // up to the database, and it is free to answer differently per page.
    await searchProducts(workspace, { q: 'refill', page: 1, limit: 5 });

    const paged = workspace.queries.filter((query) => query.sql.toLowerCase().includes('limit'));
    const sql = paged.at(-1)?.sql.toLowerCase() ?? '';
    const from = sql.indexOf('order by');

    expect(from, 'the query has no order by at all').toBeGreaterThan(-1);
    const clause = sql.slice(from, sql.indexOf('limit', from));
    expect(
      clause.split(',').length,
      `nothing to fall back on when names are equal: ${clause.trim()}`
    ).toBeGreaterThanOrEqual(2);
  });

  it('answers a page past the end with nothing, and still knows the total', async () => {
    const result = await searchProducts(workspace, { page: 99, limit: 20 });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(CATALOGUE_SIZE);
  });

  it('pages a filtered search the same way', async () => {
    const { total, ids } = await walk(5, 'refill');

    expect(total).toBe(12);
    expect(new Set(ids).size).toBe(12);
  });
});
