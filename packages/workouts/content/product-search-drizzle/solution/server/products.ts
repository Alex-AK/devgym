import { asc, count, ilike, or } from 'drizzle-orm';

import type { Workspace } from './db';
import { type Product, products } from './schema';

export interface SearchQuery {
  /** What the user typed. Absent or blank means "everything". */
  q?: string;
  page?: number;
  limit?: number;
}

export interface SearchResult {
  items: Product[];
  /** Every row that matched, not the number on this page. */
  total: number;
  page: number;
  limit: number;
}

/**
 * `%`, `_` and `\` are the three characters LIKE reads as instructions. Escaping
 * them is what turns a pattern back into the text the user typed: without this,
 * searching for "50%" quietly matches everything containing "50".
 */
function asLiteral(term: string): string {
  return term.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function searchProducts(
  workspace: Workspace,
  query: SearchQuery = {}
): Promise<SearchResult> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 20)));

  const term = (query.q ?? '').trim();
  const pattern = `%${asLiteral(term)}%`;
  // No term means no filter at all, rather than a filter that happens to match
  // everything: the planner gets a simpler query and the intent is clearer.
  const where = term ? or(ilike(products.name, pattern), ilike(products.sku, pattern)) : undefined;

  const items = await workspace.db
    .select()
    .from(products)
    .where(where)
    // Twelve products share a name. Without the id the database is free to
    // hand back ties in whatever order it likes, and pages overlap.
    .orderBy(asc(products.name), asc(products.id))
    .limit(limit)
    .offset((page - 1) * limit);

  const [counted] = await workspace.db.select({ total: count() }).from(products).where(where);

  return { items, total: counted?.total ?? 0, page, limit };
}
