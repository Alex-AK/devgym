import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { EmployeeTable } from '../../src/client/EmployeeTable';

const ROWS = [
  { id: 1, name: 'Ada Bell', department: 'Engineering', salary: 141000, startedAt: '2021-03-01' },
  { id: 2, name: 'Bruno Vale', department: 'Engineering', salary: 118000, startedAt: '2019-11-14' },
];

let calls: URL[] = [];

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn((input: string) => {
      calls.push(new URL(input, 'http://localhost'));
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ items: ROWS, total: 12, page: 1, limit: 5 }),
      });
    })
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const lastCall = () => calls.at(-1);

describe('clicking a header sorts, and clicking again reverses it', () => {
  it('renders the rows it was given', async () => {
    render(<EmployeeTable />);
    expect(await screen.findByText('Ada Bell')).toBeDefined();
  });

  it('exposes each column header as something you can activate', async () => {
    render(<EmployeeTable />);
    await screen.findByText('Ada Bell');

    for (const label of ['Name', 'Department', 'Salary']) {
      const control = screen.getByRole('button', { name: new RegExp(label, 'i') });
      expect(control).toBeDefined();
    }
  });

  it('asks the API for the clicked column, ascending', async () => {
    const user = userEvent.setup();
    render(<EmployeeTable />);
    await screen.findByText('Ada Bell');

    await user.click(screen.getByRole('button', { name: /salary/i }));

    await waitFor(() => {
      expect(lastCall()?.searchParams.get('sort')).toBe('salary');
      expect(lastCall()?.searchParams.get('dir')).toBe('asc');
    });
  });

  it('flips the direction when the active column is clicked again', async () => {
    const user = userEvent.setup();
    render(<EmployeeTable />);
    await screen.findByText('Ada Bell');

    const salary = screen.getByRole('button', { name: /salary/i });
    await user.click(salary);
    await waitFor(() => expect(lastCall()?.searchParams.get('dir')).toBe('asc'));

    await user.click(salary);
    await waitFor(() => expect(lastCall()?.searchParams.get('dir')).toBe('desc'));
  });

  it('starts a different column ascending rather than inheriting the direction', async () => {
    const user = userEvent.setup();
    render(<EmployeeTable />);
    await screen.findByText('Ada Bell');

    const salary = screen.getByRole('button', { name: /salary/i });
    await user.click(salary);
    await user.click(salary);
    await waitFor(() => expect(lastCall()?.searchParams.get('dir')).toBe('desc'));

    await user.click(screen.getByRole('button', { name: /department/i }));
    await waitFor(() => {
      expect(lastCall()?.searchParams.get('sort')).toBe('department');
      expect(lastCall()?.searchParams.get('dir')).toBe('asc');
    });
  });

  it('returns to page 1 when the sort changes', async () => {
    const user = userEvent.setup();
    render(<EmployeeTable />);
    await screen.findByText('Ada Bell');

    await user.click(screen.getByRole('button', { name: /next/i }));
    await waitFor(() => expect(lastCall()?.searchParams.get('page')).toBe('2'));

    await user.click(screen.getByRole('button', { name: /salary/i }));
    await waitFor(() => expect(lastCall()?.searchParams.get('page')).toBe('1'));
  });
});
