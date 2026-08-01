import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { createWorkspace, type Workspace } from '../../src/server/db';
import { searchProducts } from '../../src/server/products';

let workspace: Workspace;

beforeAll(async () => {
  workspace = await createWorkspace();
}, 60_000);

afterAll(async () => {
  await workspace?.close();
});

const names = (result: { items: { name: string }[] }) =>
  result.items.map((item) => item.name).sort();

describe('it searches the SKU too', () => {
  it('finds a product by a code that is nowhere in its name', async () => {
    const result = await searchProducts(workspace, { q: 'LMP' });

    expect(names(result)).toEqual(['Desk lamp', 'Floor lamp']);
  });

  it('ignores case in the SKU as well', async () => {
    const result = await searchProducts(workspace, { q: 'lmp' });

    expect(names(result)).toEqual(['Desk lamp', 'Floor lamp']);
  });

  it('finds a whole SKU typed out', async () => {
    const result = await searchProducts(workspace, { q: 'TEE-050' });

    expect(names(result)).toEqual(['50% Cotton Tee']);
  });

  it('counts a product once when the term is in both its name and its SKU', async () => {
    const result = await searchProducts(workspace, { q: 'cab' });

    // Three cable products, each matching on both columns. An OR that turns
    // into a join would hand each of them back twice.
    expect(names(result)).toEqual(['Cable tidy', 'CableXA', 'Cable_A'].sort());
    expect(result.total).toBe(3);
  });

  it('still matches on the name when the SKU has nothing to do with it', async () => {
    const result = await searchProducts(workspace, { q: 'lamp' });

    expect(names(result)).toEqual(['Desk lamp', 'Floor lamp']);
  });
});
