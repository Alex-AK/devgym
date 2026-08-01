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

describe('what the user typed is text, not a pattern', () => {
  it('treats a percent sign as a percent sign', async () => {
    const result = await searchProducts(workspace, { q: '50%' });

    // Unescaped, this becomes %50%% and quietly picks up "Widget 501" as well.
    expect(names(result)).toEqual(['50% Cotton Tee']);
  });

  it('treats an underscore as an underscore', async () => {
    const result = await searchProducts(workspace, { q: 'Cable_A' });

    // Unescaped, the underscore matches any single character, so "CableXA"
    // comes back too.
    expect(names(result)).toEqual(['Cable_A']);
  });

  it('does not turn a lone percent sign into "everything"', async () => {
    const result = await searchProducts(workspace, { q: '%' });

    expect(result.total, 'a search for "%" matched the whole catalogue').toBe(1);
    expect(names(result)).toEqual(['50% Cotton Tee']);
  });

  it('does not turn a lone underscore into "everything"', async () => {
    const result = await searchProducts(workspace, { q: '_' });

    expect(result.total, 'a search for "_" matched the whole catalogue').toBe(1);
    expect(names(result)).toEqual(['Cable_A']);
  });

  it('survives a backslash, which is the escape character itself', async () => {
    const result = await searchProducts(workspace, { q: '\\' });

    // Escape the % and the _ but not the \ and this is a dangling escape, which
    // Postgres refuses outright.
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('still finds the tee by a term with no special characters', async () => {
    const result = await searchProducts(workspace, { q: 'cotton' });

    expect(names(result)).toEqual(['50% Cotton Tee', 'Cotton Tee, plain']);
  });
});
