import { beforeEach, describe, expect, it } from 'vitest';

import { createDb, type Db } from '../../src/server/db';
import { listEmployees } from '../../src/server/employees';

let db: Db;
beforeEach(() => {
  db = createDb();
});

describe('the handler accepts sort and direction', () => {
  it('still works with no sorting arguments', () => {
    const result = listEmployees(db, { page: 1, limit: 5 });
    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(12);
  });

  it('defaults to name ascending', () => {
    const names = listEmployees(db, { limit: 12 }).items.map((row) => row.name);
    expect(names[0]).toBe('Ada Bell');
    expect(names.at(-1)).toBe('Lena Voss');
  });

  it('sorts by an explicit column ascending', () => {
    const salaries = listEmployees(db, { limit: 12, sort: 'salary' }).items.map(
      (row) => row.salary
    );
    expect(salaries).toEqual([...salaries].sort((a, b) => a - b));
  });

  it('reverses when the direction is desc', () => {
    const salaries = listEmployees(db, { limit: 12, sort: 'salary', dir: 'desc' }).items.map(
      (row) => row.salary
    );
    expect(salaries).toEqual([...salaries].sort((a, b) => b - a));
  });

  it('sorts by a text column', () => {
    const names = listEmployees(db, { limit: 12, sort: 'name', dir: 'desc' }).items.map(
      (row) => row.name
    );
    expect(names[0]).toBe('Lena Voss');
  });
});
