import { asc, desc, sql } from 'drizzle-orm';

import { type Db, employees } from './db';

/** The allowlist is the security boundary: input never becomes SQL. */
const SORTABLE = {
  name: employees.name,
  department: employees.department,
  salary: employees.salary,
  startedAt: employees.startedAt,
} as const;

export type SortColumn = keyof typeof SORTABLE;
export type SortDirection = 'asc' | 'desc';

export interface ListQuery {
  page?: number;
  limit?: number;
  sort?: SortColumn;
  dir?: SortDirection;
}

export interface ListResult {
  items: (typeof employees.$inferSelect)[];
  total: number;
  page: number;
  limit: number;
}

export function listEmployees(db: Db, query: ListQuery = {}): ListResult {
  const page = Math.max(1, Math.trunc(query.page ?? 1));
  const limit = Math.min(50, Math.max(1, Math.trunc(query.limit ?? 5)));

  // Unknown values fall back rather than throwing, so a stale bookmark still loads.
  const column = SORTABLE[query.sort as SortColumn] ?? SORTABLE.name;
  const direction = query.dir === 'desc' ? desc : asc;

  const items = db
    .select()
    .from(employees)
    // id breaks ties, so paging through equal departments cannot repeat or skip a row.
    .orderBy(direction(column), asc(employees.id))
    .limit(limit)
    .offset((page - 1) * limit)
    .all();

  const [counted] = db
    .select({ total: sql<number>`count(*)` })
    .from(employees)
    .all();

  return { items, total: counted?.total ?? 0, page, limit };
}
