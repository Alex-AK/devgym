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

const names = (result: { items: { name: string }[] }) =>
  result.items.map((item) => item.name).sort();

describe('it finds matches anywhere in the name', () => {
  it('matches part of a name, not just the start', async () => {
    const result = await searchProducts(workspace, { q: 'idget' });

    expect(names(result)).toEqual(['Blue Widget', 'WIDGET pro', 'Widget 501', 'widget mini']);
  });

  it('ignores case on both sides', async () => {
    const lower = await searchProducts(workspace, { q: 'widget' });
    const upper = await searchProducts(workspace, { q: 'WIDGET' });
    const mixed = await searchProducts(workspace, { q: 'WiDgEt' });

    expect(names(lower)).toEqual(names(upper));
    expect(names(mixed)).toEqual(names(upper));
    expect(lower.total).toBe(4);
  });

  it('returns the whole catalogue when nothing was typed', async () => {
    const absent = await searchProducts(workspace, {});
    const empty = await searchProducts(workspace, { q: '' });
    const spaces = await searchProducts(workspace, { q: '   ' });

    expect(absent.total).toBe(CATALOGUE_SIZE);
    expect(empty.total).toBe(CATALOGUE_SIZE);
    expect(spaces.total, 'a search for whitespace is not a search').toBe(CATALOGUE_SIZE);
  });

  it('comes back empty rather than throwing when nothing matches', async () => {
    const result = await searchProducts(workspace, { q: 'kryptonite' });

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('handles a term with a comma in it', async () => {
    const result = await searchProducts(workspace, { q: ', heavy' });
    expect(names(result)).toEqual(['Bracket, heavy']);
  });
});
