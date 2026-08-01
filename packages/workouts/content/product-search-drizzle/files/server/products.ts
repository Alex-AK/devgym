import type { Workspace } from './db';
import type { Product } from './schema';

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
 * Search the catalogue.
 *
 * TODO: all of it. See brief.md, but in short: match name or SKU, ignore case,
 * match anywhere in the value, treat what the user typed as text rather than as
 * a pattern, order by name with a tie-break, and page it.
 */
export async function searchProducts(
  workspace: Workspace,
  query: SearchQuery = {}
): Promise<SearchResult> {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(100, Math.max(1, Math.trunc(query.limit ?? 20)));

  void workspace;
  return { items: [], total: 0, page, limit };
}
