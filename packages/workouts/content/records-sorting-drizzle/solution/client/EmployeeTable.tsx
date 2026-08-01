import * as React from 'react';

import { type Employee, fetchEmployees, type SortColumn, type SortDirection } from './api';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'salary', label: 'Salary' },
  { key: 'startedAt', label: 'Started' },
] as const;

const ARIA_SORT = { asc: 'ascending', desc: 'descending' } as const;

export function EmployeeTable(): React.ReactElement {
  const [rows, setRows] = React.useState<Employee[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  const [sort, setSort] = React.useState<SortColumn>('name');
  const [dir, setDir] = React.useState<SortDirection>('asc');

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmployees({ page, sort, dir })
      .then((data) => {
        if (!cancelled) setRows(data.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, sort, dir]);

  // A new column always starts ascending; the active column flips.
  function toggle(key: SortColumn): void {
    if (key === sort) {
      setDir((current) => (current === 'asc' ? 'desc' : 'asc'));
    } else {
      setSort(key);
      setDir('asc');
    }
    setPage(1); // page 4 of a different ordering means nothing
  }

  return (
    <div>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th
                key={column.key}
                scope="col"
                aria-sort={column.key === sort ? ARIA_SORT[dir] : 'none'}
              >
                <button type="button" onClick={() => toggle(column.key)}>
                  {column.label}
                  {column.key === sort && (
                    <span aria-hidden="true">{dir === 'asc' ? '▲' : '▼'}</span>
                  )}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.department}</td>
              <td>{row.salary}</td>
              <td>{row.startedAt ?? '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))}>
        Previous
      </button>
      <span>Page {page}</span>
      <button type="button" onClick={() => setPage((p) => p + 1)}>
        Next
      </button>
      {loading && <span role="status">Loading…</span>}
    </div>
  );
}
