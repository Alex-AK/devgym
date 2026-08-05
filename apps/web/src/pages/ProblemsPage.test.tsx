import type { ProblemSummary } from '@hone/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { ProblemsPage } from '@/pages/ProblemsPage';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, problems: vi.fn() } };
});

function problem(overrides: Partial<ProblemSummary> & { slug: string }): ProblemSummary {
  return {
    title: overrides.slug,
    category: 'sql',
    difficulty: 'easy',
    relevance: 'daily',
    type: 'short-text',
    position: 0,
    status: 'unseen',
    attemptsCount: 0,
    dueAt: null,
    tags: [],
    ...overrides,
  };
}

/**
 * Positions are the interleaved round robin the seeder writes, so the default
 * order is deliberately neither alphabetical nor grouped: it is what proves the
 * page can get back to something no column produces.
 */
const PROBLEMS: ProblemSummary[] = [
  problem({
    slug: 'zebra-window',
    title: 'Zebra windows',
    category: 'sql',
    difficulty: 'hard',
    relevance: 'foundational',
    position: 1,
    attemptsCount: 5,
  }),
  problem({
    slug: 'alpha-effect',
    title: 'Alpha effects',
    category: 'react',
    difficulty: 'medium',
    relevance: 'occasional',
    position: 2,
    attemptsCount: 1,
    status: 'solved',
  }),
  problem({
    slug: 'mid-parse',
    title: 'Mid parsing',
    category: 'dom',
    difficulty: 'easy',
    relevance: 'daily',
    position: 3,
    attemptsCount: 3,
  }),
];

beforeEach(() => {
  vi.mocked(api.problems).mockResolvedValue(PROBLEMS);
});

afterEach(cleanup);

/** Stands in for `/practice` and prints the scope it was handed. */
function PracticeProbe(): React.ReactElement {
  return <p>practice{useLocation().search}</p>;
}

function renderList(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={['/library/problems']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/library/problems" element={<ProblemsPage />} />
          <Route path="/practice" element={<PracticeProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** Row titles in the order the table renders them. */
function titles(): string[] {
  const [, ...rows] = screen.getAllByRole('row');
  return rows.map((row) => within(row).getAllByRole('cell')[0]?.textContent ?? '');
}

/** The `th`, whose `aria-sort` is the only place the current order is stated. */
const header = (name: string): HTMLElement => screen.getByRole('columnheader', { name });

/** The control inside it. Named exactly, so it never matches a filter button. */
const sortBy = (name: string): HTMLElement => screen.getByRole('button', { name });

describe('sorting the problem table', () => {
  it('opens in seeded position order, which no column reproduces', async () => {
    renderList();
    expect(await screen.findByRole('button', { name: 'Difficulty' })).toBeTruthy();

    expect(titles()).toEqual(['Zebra windows', 'Alpha effects', 'Mid parsing']);
    expect(header('Difficulty').getAttribute('aria-sort')).toBe('none');
  });

  it('sorts difficulty by its own order rather than alphabetically', async () => {
    renderList();
    await userEvent.click(await screen.findByRole('button', { name: 'Difficulty' }));

    // Alphabetical would be easy, hard, medium, which is the bug this catches.
    expect(titles()).toEqual(['Mid parsing', 'Alpha effects', 'Zebra windows']);
    expect(header('Difficulty').getAttribute('aria-sort')).toBe('ascending');
  });

  it('sorts relevance by its own order too', async () => {
    renderList();
    await screen.findByRole('button', { name: 'Difficulty' });
    await userEvent.click(sortBy('Relevance'));

    // daily, occasional, foundational. Alphabetical would lead with daily too,
    // so the tell is foundational sorting last rather than first.
    expect(titles()).toEqual(['Mid parsing', 'Alpha effects', 'Zebra windows']);
  });

  it('reverses on a second click and returns to position order on a third', async () => {
    renderList();
    const button = await screen.findByRole('button', { name: 'Difficulty' });

    await userEvent.click(button);
    await userEvent.click(button);
    expect(titles()).toEqual(['Zebra windows', 'Alpha effects', 'Mid parsing']);
    expect(header('Difficulty').getAttribute('aria-sort')).toBe('descending');

    await userEvent.click(button);
    expect(titles()).toEqual(['Zebra windows', 'Alpha effects', 'Mid parsing']);
    expect(header('Difficulty').getAttribute('aria-sort')).toBe('none');
  });

  it('sorts one column at a time', async () => {
    renderList();
    await userEvent.click(await screen.findByRole('button', { name: 'Difficulty' }));
    await userEvent.click(sortBy('Problem'));

    expect(titles()).toEqual(['Alpha effects', 'Mid parsing', 'Zebra windows']);
    expect(header('Difficulty').getAttribute('aria-sort')).toBe('none');
    expect(header('Problem').getAttribute('aria-sort')).toBe('ascending');
  });
});

describe('filtering by several categories', () => {
  it('keeps the rows from every category picked', async () => {
    renderList();
    await userEvent.click(await screen.findByRole('button', { name: /^Category:/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /React/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /DOM/ }));

    expect(titles()).toEqual(['Alpha effects', 'Mid parsing']);
  });

  it('closes on Escape, and hands focus back to the button', async () => {
    renderList();
    const button = await screen.findByRole('button', { name: /^Category:/ });
    await userEvent.click(button);
    expect(screen.getByRole('checkbox', { name: /React/ })).toBeTruthy();

    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('checkbox', { name: /React/ })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('is operable from the keyboard alone', async () => {
    renderList();
    await screen.findByRole('button', { name: /^Category:/ });

    // Tab past the search box to the category button, open it, and the first
    // checkbox is already focused.
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    await userEvent.keyboard(' ');

    expect(screen.getByRole('button', { name: /^Category: DOM/ })).toBeTruthy();
    expect(titles()).toEqual(['Mid parsing']);
  });

  /** Sorting is presentation, so it must not reach the scope a session runs. */
  it('sends every picked category to practice as a repeated param, and never the sort', async () => {
    renderList();
    await userEvent.click(await screen.findByRole('button', { name: 'Difficulty' }));
    await userEvent.click(screen.getByRole('button', { name: /^Category:/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /React/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /SQL/ }));
    await userEvent.keyboard('{Escape}');
    await userEvent.click(screen.getByRole('button', { name: /Practice these/ }));

    expect(screen.getByText('practice?category=react&category=sql')).toBeTruthy();
  });
});
