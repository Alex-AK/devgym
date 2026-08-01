import * as React from 'react';

import { type Employee, fetchEmployees } from './api';

const COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'department', label: 'Department' },
  { key: 'salary', label: 'Salary' },
  { key: 'startedAt', label: 'Started' },
] as const;

export function EmployeeTable(): React.ReactElement {
  const [rows, setRows] = React.useState<Employee[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(false);
  // TODO: the table needs to remember which column is sorted, and which way.

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchEmployees({ page })
      .then((data) => {
        if (!cancelled) setRows(data.items);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  return (
    <div>
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column.key} scope="col">
                {/*
                  TODO: this needs to be a real control. A screen reader user should be
                  able to sort too, and the current sort should be visible.
                */}
                {column.label}
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
