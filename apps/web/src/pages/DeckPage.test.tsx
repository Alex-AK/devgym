import type { DeckDetail } from '@devgym/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { DeckPage } from '@/pages/DeckPage';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, deck: vi.fn() } };
});

const DECK: DeckDetail = {
  cardCount: 3,
  cards: [
    { back: 'The unmatched left rows.', front: 'Question one', id: 'one' },
    { back: 'Five rows.', front: 'Question two', id: 'two' },
    { back: 'The anti-join.', front: 'Question three', id: 'three' },
  ],
  minutes: 5,
  order: 1,
  page: { section: 'sql', slug: 'what-a-join-does', title: 'What a join actually does' },
  practiseLinks: [{ kind: 'problem', slug: 'sql-anti-join', title: 'Rows with no match' }],
  slug: 'the-join-family',
  sources: [{ author: 'PostgreSQL', title: 'Table Expressions', url: 'https://example.invalid' }],
  summary: 'A summary.',
  title: 'The join family',
  verified: '2026-08-02',
};

function renderDeck(): void {
  vi.mocked(api.deck).mockResolvedValue(DECK);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cards/the-join-family']}>
        <Routes>
          <Route element={<DeckPage />} path="/cards/:slug" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/** The document-level binding, fired the way a keypress on nothing in particular arrives. */
function press(key: string): void {
  fireEvent.keyDown(document.body, { key });
}

const position = (): string => screen.getByText(/^Card \d+ of \d+$/).textContent ?? '';

afterEach(cleanup);

describe('DeckPage keyboard flow', () => {
  it('flips on Space and grades on 1 and 2, one card at a time', async () => {
    renderDeck();
    await screen.findByText('Question one');

    expect(position()).toBe('Card 1 of 3');
    expect(screen.queryByText('The unmatched left rows.')).toBeNull();

    press(' ');
    expect(screen.getByText('The unmatched left rows.')).toBeTruthy();

    // Grading is refused until the back has been read, so `1` on a fresh card
    // cannot skip past it.
    press('1');
    expect(position()).toBe('Card 2 of 3');
    expect(screen.getByText('Question two')).toBeTruthy();
    expect(screen.queryByText('Five rows.')).toBeNull();

    press('2');
    expect(position()).toBe('Card 2 of 3');

    press(' ');
    press('2');
    expect(position()).toBe('Card 3 of 3');

    press(' ');
    press('k');
    expect(screen.getByText('1 of 3 on sight')).toBeTruthy();
  });

  it('does not grade until the card is flipped', async () => {
    renderDeck();
    await screen.findByText('Question one');

    press('1');
    press('j');
    press('2');
    press('k');
    expect(position()).toBe('Card 1 of 3');
  });

  it('grades once when Space arrives on a focused grade button', async () => {
    const user = userEvent.setup();
    renderDeck();
    await screen.findByText('Question one');

    press(' ');
    const gotIt = screen.getByRole('button', { name: /got it/i });
    gotIt.focus();
    expect(document.activeElement).toBe(gotIt);

    // The hazard, both ways round. A document-level Space binding that also
    // handles this keypress either grades twice, or calls preventDefault and
    // leaves the button inert. One press, one card, and the grade it recorded
    // is the button's own.
    await user.keyboard(' ');
    expect(position()).toBe('Card 2 of 3');

    press(' ');
    press('1');
    press(' ');
    press('1');
    expect(screen.getByText('3 of 3 on sight')).toBeTruthy();
  });

  it('leaves no grade control focused after grading, so the next Space flips', async () => {
    const user = userEvent.setup();
    renderDeck();
    await screen.findByText('Question one');

    press(' ');
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(position()).toBe('Card 2 of 3');
    expect(document.activeElement?.tagName).not.toBe('BUTTON');

    press(' ');
    expect(screen.getByText('Five rows.')).toBeTruthy();
    expect(position()).toBe('Card 2 of 3');
  });

  it('moves focus onto the card, so a screen reader hears the question', async () => {
    renderDeck();
    await screen.findByText('Question one');

    const group = screen.getByRole('group');
    await waitFor(() => {
      expect(document.activeElement).toBe(group);
    });
    expect(group.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('keeps the answer live region mounted before it has anything to say', async () => {
    renderDeck();
    await screen.findByText('Question one');

    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    press(' ');
    expect(region.textContent).toContain('The unmatched left rows.');
  });
});

describe('DeckPage summary and re-run', () => {
  it('lists the missed cards and re-runs only those', async () => {
    const user = userEvent.setup();
    renderDeck();
    await screen.findByText('Question one');

    // Miss the first, get the second, miss the third.
    press(' ');
    press('2');
    press(' ');
    press('1');
    press(' ');
    press('2');

    expect(screen.getByText('1 of 3 on sight')).toBeTruthy();
    expect(screen.getByText('Question one')).toBeTruthy();
    expect(screen.getByText('Question three')).toBeTruthy();
    expect(screen.queryByText('Question two')).toBeNull();

    await user.click(screen.getByRole('button', { name: /run the ones you missed \(2\)/i }));

    expect(position()).toBe('Card 1 of 2');
    expect(screen.getByText('Pass 2: the 2 you missed')).toBeTruthy();
    expect(screen.getByText('Question one')).toBeTruthy();

    press(' ');
    press('1');
    expect(screen.getByText('Question three')).toBeTruthy();
    press(' ');
    press('1');

    expect(screen.getByText('2 of 2 on sight')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /run the ones you missed/i })).toBeNull();
  });

  it('ends on the page it drills and where to practise it', async () => {
    renderDeck();
    await screen.findByText('Question one');

    for (const _ of DECK.cards) {
      press(' ');
      press('1');
    }

    expect(screen.getByRole('link', { name: /what a join actually does/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /rows with no match/i })).toBeTruthy();
  });
});
