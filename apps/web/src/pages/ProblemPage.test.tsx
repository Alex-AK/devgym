import type { ProblemDetail } from '@hone/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { ProblemPage } from '@/pages/ProblemPage';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      problem: vi.fn(),
      activeSession: vi.fn(),
      handbook: vi.fn(),
      reset: vi.fn(),
      next: vi.fn(),
    },
  };
});

const SOLVED: ProblemDetail = {
  slug: 'js-find',
  title: 'Find the first match',
  category: 'js-apis',
  difficulty: 'easy',
  relevance: 'daily',
  type: 'short-text',
  position: 1,
  status: 'solved',
  attemptsCount: 2,
  dueAt: null,
  tags: [],
  prompt: 'Which array method returns the first match?',
  orderMatters: null,
  revealedHints: [],
  hintsTotal: 2,
  starter: null,
  solutionViewed: false,
  canRevealSolution: false,
  solution: '`find`',
  explanation: 'It returns the element, not the index.',
};

beforeEach(() => {
  vi.mocked(api.problem).mockResolvedValue(SOLVED);
  vi.mocked(api.activeSession).mockResolvedValue({ session: null });
  vi.mocked(api.handbook).mockResolvedValue([]);
  vi.mocked(api.reset).mockResolvedValue({ status: 'unseen', next: null });
});

afterEach(cleanup);

function renderSolved(): void {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter
        initialEntries={['/problems/js-find']}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      >
        <Routes>
          <Route path="/problems/:slug" element={<ProblemPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * Starting over drops the problem off the review ladder, and an interval built
 * over months only comes back by re-solving it that many times. The control sits
 * one button away from "Next problem", so the gate is the point of these tests.
 */
describe('starting a solved problem over', () => {
  it('does not reset on the first click', async () => {
    renderSolved();
    await userEvent.click(await screen.findByRole('button', { name: /Start over/ }));

    expect(api.reset).not.toHaveBeenCalled();
    expect(screen.getByText(/drops it off the review ladder/)).toBeTruthy();
  });

  it('resets on the second, once it has said what it costs', async () => {
    renderSolved();
    await userEvent.click(await screen.findByRole('button', { name: /Start over/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Start over' }));

    expect(api.reset).toHaveBeenCalledWith('js-find');
  });

  it('backs out without touching anything', async () => {
    renderSolved();
    await userEvent.click(await screen.findByRole('button', { name: /Start over/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(api.reset).not.toHaveBeenCalled();
    expect(screen.queryByText(/drops it off the review ladder/)).toBeNull();
  });
});
