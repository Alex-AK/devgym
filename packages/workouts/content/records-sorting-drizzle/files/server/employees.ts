import { sql } from 'drizzle-orm';

import { type Db, employees } from './db';

export interface ListQuery {
  page?: number;
  limit?: number;
  // TODO: sorting arrives here as `sort` and `dir`.
}

export interface ListResult {
  items: (typeof employees.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
}

/**
 * List employees, newest API in the codebase so the shape is up to you.
 *
 * Currently: paginated, unsorted (whatever order SQLite hands back).
 */
export function listEmployees(db: Db, query: ListQuery = {}): ListResult {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(query.limit ?? 5)));

  const items = db
    .select()
    .from(employees)
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const [counted] = db
    .select({ total: sql<number>`count(*)` })
    .from(employees)
    .all();

  return { items, total: counted?.total ?? 0, page, limit };
}
