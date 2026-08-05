import type { CardLibrary } from '@hone/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/lib/api';
import { CardsPage } from '@/pages/CardsPage';

vi.mock('@/lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/api')>();
  return { ...actual, api: { ...actual.api, cards: vi.fn() } };
});

/**
 * Two decks, because the run crosses them: card ids repeat across decks, one
 * rep is cited by both, and the two were verified on different days. Each of
 * those is a thing the summary has to survive.
 */
const LIBRARY: CardLibrary = {
  cards: [
    { back: 'Answer one.', deck: 'joins', front: 'Question one', id: 'first' },
    { back: 'Answer two.', deck: 'joins', front: 'Question two', id: 'second' },
    { back: 'Answer three.', deck: 'joins', front: 'Question three', id: 'third' },
    { back: 'Answer four.', deck: 'equality', front: 'Question four', id: 'first' },
    { back: 'Answer five.', deck: 'equality', front: 'Question five', id: 'second' },
    { back: 'Answer six.', deck: 'equality', front: 'Question six', id: 'third' },
  ],
  decks: [
    {
      page: { section: 'sql', slug: 'what-a-join-does', title: 'What a join actually does' },
      practiseLinks: [
        {
          difficulty: 'medium',
          kind: 'problem',
          slug: 'sql-anti-join',
          title: 'Rows with no match',
        },
        { difficulty: 'easy', kind: 'problem', slug: 'shared-rep', title: 'Cited by both decks' },
      ],
      slug: 'joins',
      sources: [
        { author: 'PostgreSQL', title: 'Table Expressions', url: 'https://example.invalid/joins' },
      ],
      verified: '2026-07-30',
    },
    {
      page: { section: 'javascript', slug: 'equality', title: 'The four equalities' },
      practiseLinks: [
        { difficulty: 'hard', kind: 'workout', slug: 'nan-hunt', title: 'The NaN hunt' },
        { difficulty: 'easy', kind: 'problem', slug: 'shared-rep', title: 'Cited by both decks' },
      ],
      slug: 'equality',
      sources: [
        { author: 'MDN', title: 'Equality comparisons', url: 'https://example.invalid/equality' },
      ],
      verified: '2026-08-02',
    },
  ],
};

function mount(): void {
  vi.mocked(api.cards).mockResolvedValue(LIBRARY);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/cards']}>
        <Routes>
          <Route element={<CardsPage />} path="/cards" />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

/**
 * The shuffle picks `j` from `Math.random() * (i + 1)`, so a roll just under 1
 * makes every card swap with itself. The run then deals in library order and a
 * flow test can name the card it expects. The shuffle itself is asserted at the
 * bottom of this file, against the real thing.
 */
function renderRun(): void {
  vi.spyOn(Math, 'random').mockReturnValue(0.999999);
  mount();
}

/** The document-level binding, fired the way a keypress on nothing in particular arrives. */
function press(key: string): void {
  fireEvent.keyDown(document.body, { key });
}

const position = (): string => screen.getByText(/^Card \d+ of \d+$/).textContent ?? '';

/** Whichever card is up, without assuming which one that is. */
const front = (): string => screen.getByText(/^Question /).textContent ?? '';

/** Flip and grade every remaining card, missing the ones whose front matches. */
function walk(miss: RegExp = /(?!)/): string[] {
  const seen: string[] = [];
  while (screen.queryByText(/^Card \d+ of \d+$/)) {
    const showing = front();
    seen.push(showing);
    press(' ');
    press(miss.test(showing) ? '2' : '1');
    // A grade that silently does nothing would otherwise hang the suite.
    if (seen.length > LIBRARY.cards.length) throw new Error('the run is not advancing');
  }
  return seen;
}

afterEach(cleanup);

describe('CardsPage keyboard flow', () => {
  it('flips on Space and grades on 1 and 2, one card at a time', async () => {
    renderRun();
    await screen.findByText('Question one');

    expect(position()).toBe('Card 1 of 6');
    expect(screen.queryByText('Answer one.')).toBeNull();

    press(' ');
    expect(screen.getByText('Answer one.')).toBeTruthy();

    // Grading is refused until the back has been read, so `1` on a fresh card
    // cannot skip past it.
    press('1');
    expect(position()).toBe('Card 2 of 6');
    expect(screen.getByText('Question two')).toBeTruthy();
    expect(screen.queryByText('Answer two.')).toBeNull();

    press('2');
    expect(position()).toBe('Card 2 of 6');

    press(' ');
    press('2');
    expect(position()).toBe('Card 3 of 6');

    press(' ');
    press('k');
    expect(position()).toBe('Card 4 of 6');
  });

  it('does not grade until the card is flipped', async () => {
    renderRun();
    await screen.findByText('Question one');

    press('1');
    press('j');
    press('2');
    press('k');
    expect(position()).toBe('Card 1 of 6');
  });

  it('grades once when Space arrives on a focused grade button', async () => {
    const user = userEvent.setup();
    renderRun();
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
    expect(position()).toBe('Card 2 of 6');

    walk();
    expect(screen.getByText('6 of 6 on sight')).toBeTruthy();
  });

  it('leaves no grade control focused after grading, so the next Space flips', async () => {
    const user = userEvent.setup();
    renderRun();
    await screen.findByText('Question one');

    press(' ');
    await user.click(screen.getByRole('button', { name: /got it/i }));
    expect(position()).toBe('Card 2 of 6');
    expect(document.activeElement?.tagName).not.toBe('BUTTON');

    press(' ');
    expect(screen.getByText('Answer two.')).toBeTruthy();
    expect(position()).toBe('Card 2 of 6');
  });

  it('moves focus onto the card, so a screen reader hears the question', async () => {
    renderRun();
    await screen.findByText('Question one');

    const group = screen.getByRole('group');
    await waitFor(() => {
      expect(document.activeElement).toBe(group);
    });
    expect(group.getAttribute('aria-labelledby')).toBeTruthy();
  });

  it('keeps the answer live region mounted before it has anything to say', async () => {
    renderRun();
    await screen.findByText('Question one');

    const region = screen.getByRole('status');
    expect(region.textContent).toBe('');

    press(' ');
    expect(region.textContent).toContain('Answer one.');
  });
});

describe('CardsPage run', () => {
  it('runs every card in the library, once each, with no deck to choose first', async () => {
    renderRun();
    await screen.findByText('Question one');

    // /cards is the run. There is nothing between arriving and the first card.
    expect(position()).toBe('Card 1 of 6');
    expect(screen.getByText(/All 6 cards, shuffled/)).toBeTruthy();

    const seen = walk();
    expect(seen).toHaveLength(LIBRARY.cards.length);
    expect(new Set(seen)).toEqual(new Set(LIBRARY.cards.map((card) => card.front)));
  });

  it('deals a different first card from one visit to the next', async () => {
    // The real shuffle, not the pinned one: in file order every morning would
    // open on the same question.
    const firsts = new Set<string>();
    for (let visit = 0; visit < 12; visit += 1) {
      mount();
      await screen.findByText(/^Question /);
      firsts.add(front());
      cleanup();
    }
    expect(firsts.size).toBeGreaterThan(1);
  });
});

describe('CardsPage summary and re-run', () => {
  it('lists the missed cards and re-runs only those', async () => {
    const user = userEvent.setup();
    renderRun();
    await screen.findByText('Question one');

    walk(/one|three/);

    expect(screen.getByText('4 of 6 on sight')).toBeTruthy();
    expect(screen.getByText('Question one')).toBeTruthy();
    expect(screen.getByText('Question three')).toBeTruthy();
    expect(screen.queryByText('Question two')).toBeNull();

    await user.click(screen.getByRole('button', { name: /run the ones you missed \(2\)/i }));

    expect(position()).toBe('Card 1 of 2');
    expect(screen.getByText('Pass 2: the 2 you missed.')).toBeTruthy();
    expect(screen.getByText('Question one')).toBeTruthy();

    walk();

    expect(screen.getByText('2 of 2 on sight')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /run the ones you missed/i })).toBeNull();
  });

  it('gathers the pages and the reps behind a clean run, each listed once', async () => {
    renderRun();
    await screen.findByText('Question one');

    walk();

    // Both decks, so both pages, and the rep they share appears once.
    expect(screen.getByRole('link', { name: /what a join actually does/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /the four equalities/i })).toBeTruthy();
    expect(screen.getAllByRole('link', { name: /cited by both decks/i })).toHaveLength(1);
    expect(screen.getByRole('link', { name: /the nan hunt/i })).toBeTruthy();
  });

  it('narrows the reading to the decks you actually missed cards from', async () => {
    renderRun();
    await screen.findByText('Question one');

    // Only the first deck loses a card, so the second deck's page and its
    // workout are not what you need next.
    walk(/two/);

    expect(screen.getByRole('link', { name: /what a join actually does/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /rows with no match/i })).toBeTruthy();
    expect(screen.queryByRole('link', { name: /the four equalities/i })).toBeNull();
    expect(screen.queryByRole('link', { name: /the nan hunt/i })).toBeNull();
  });

  it('credits every deck the run drew from, whatever you missed', async () => {
    renderRun();
    await screen.findByText('Question one');

    walk(/two/);

    // Sources are attribution for what you were shown, so they do not narrow.
    expect(screen.getByRole('link', { name: /table expressions/i })).toBeTruthy();
    expect(screen.getByRole('link', { name: /equality comparisons/i })).toBeTruthy();
    expect(
      screen.getByText(
        'Claims last checked against these sources between 2026-07-30 and 2026-08-02.'
      )
    ).toBeTruthy();
  });
});
