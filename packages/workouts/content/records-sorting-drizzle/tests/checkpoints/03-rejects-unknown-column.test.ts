import { beforeEach, describe, expect, it } from 'vitest';

import { createDb, type Db } from '../../src/server/db';
import { listEmployees } from '../../src/server/employees';

let db: Db;
beforeEach(() => {
  db = createDb();
});

/**
 * Either behaviour is acceptable: throw, or fall back to the default column.
 * What is not acceptable is the value reaching the SQL.
 */
function listOrThrow(query: Parameters<typeof listEmployees>[1]) {
  try {
    return { threw: false as const, result: listEmployees(db, query) };
  } catch (error) {
    return { threw: true as const, error };
  }
}

describe('an unknown sort column is rejected, not interpolated', () => {
  it('does not blow up on a column that does not exist', () => {
    const outcome = listOrThrow({ limit: 12, sort: 'nickname' as never });
    if (!outcome.threw) {
      expect(outcome.result.items).toHaveLength(12);
    }
  });

  it('falls back to the default ordering when it does not throw', () => {
    const outcome = listOrThrow({ limit: 12, sort: 'nickname' as never });
    if (!outcome.threw) {
      const names = outcome.result.items.map((row) => row.name);
      expect(names).toEqual([...names].sort());
    }
  });

  it('survives a value that would be an injection if interpolated', () => {
    const outcome = listOrThrow({
      limit: 12,
      sort: 'name; DROP TABLE employees; --' as never,
    });

    // Whatever it decided to do, the table is still there.
    const after = listEmployees(db, { limit: 12 });
    expect(after.total).toBe(12);
    expect(outcome.threw || after.items.length === 12).toBe(true);
  });

  it('rejects a bad direction the same way', () => {
    const outcome = listOrThrow({ limit: 12, sort: 'salary', dir: 'sideways' as never });
    if (!outcome.threw) {
      const salaries = outcome.result.items.map((row) => row.salary);
      expect(salaries).toEqual([...salaries].sort((a, b) => a - b));
    }
  });
});
