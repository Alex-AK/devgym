import { beforeEach, describe, expect, it } from 'vitest';

import { createDb, type Db } from '../../src/server/db';
import { listEmployees } from '../../src/server/employees';

let db: Db;
beforeEach(() => {
  db = createDb();
});

/**
 * The whole point of this checkpoint: sorting the rows you already fetched gives
 * you page 1 re-ordered, not the globally first page. These assertions only pass
 * if the ORDER BY runs before the LIMIT.
 */
describe('sorting happens in the database, not after pagination', () => {
  it('page 1 of a descending salary sort holds the two highest salaries overall', () => {
    const page1 = listEmployees(db, { page: 1, limit: 2, sort: 'salary', dir: 'desc' });
    expect(page1.items.map((row) => row.salary)).toEqual([152000, 141000]);
  });

  it('page 1 of an ascending salary sort holds the two lowest salaries overall', () => {
    const page1 = listEmployees(db, { page: 1, limit: 2, sort: 'salary', dir: 'asc' });
    expect(page1.items.map((row) => row.salary)).toEqual([68000, 71000]);
  });

  it('walking every page yields each row exactly once, in order', () => {
    const collected: number[] = [];
    for (let page = 1; page <= 6; page += 1) {
      collected.push(
        ...listEmployees(db, { page, limit: 2, sort: 'salary', dir: 'asc' }).items.map(
          (row) => row.salary
        )
      );
    }

    expect(collected).toHaveLength(12);
    expect(new Set(collected).size).toBe(12);
    expect(collected).toEqual([...collected].sort((a, b) => a - b));
  });

  it('reports the full total, not the size of the page', () => {
    expect(listEmployees(db, { page: 2, limit: 2, sort: 'name' }).total).toBe(12);
  });
});
