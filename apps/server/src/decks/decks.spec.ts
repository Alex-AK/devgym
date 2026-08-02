import { describe, expect, it } from 'vitest';

import { allPages } from '../handbook/handbook-content';
import { problemSeeds } from '../seed/problems.seed';
import { listManifests } from '../workouts/workout-content';
import {
  listDecks,
  MAX_BACK,
  MAX_CARDS,
  MAX_FRONT,
  MIN_CARDS,
  normaliseFront,
  parseDeck,
} from './decks-content';

/**
 * The safety net for decks, and it is weaker than the one modules get. What it
 * cannot check is whether a card is **true**. A module's assertions run, so a
 * module that teaches something untrue fails the build; a card has nothing to
 * run, and a confident wrong sentence looks exactly like a confident right one.
 *
 * That gap is why `page` and `sources` are required and why the rule for
 * authoring is that every claim on a card must be checkable against the page it
 * cites. Everything below is shape: the refs resolve, the caps hold, no card
 * repeats another. A human or a run against a real engine is what checks the
 * claim.
 */

const decks = listDecks();

const pageRefs = new Set(allPages().map((page) => `${page.section}/${page.slug}`));
const practisable = new Set([
  ...problemSeeds.map((problem) => problem.slug),
  ...listManifests().map((workout) => workout.slug),
]);

/** A deck with everything the validator wants, so a test can take one thing away. */
function deck(overrides: Partial<Record<string, unknown>> = {}): string {
  return JSON.stringify({
    slug: 'ok',
    title: 'A contrast set',
    summary: 'Four things people mix up.',
    order: 1,
    minutes: 5,
    page: 'sql/what-a-join-does',
    practise: ['sql-anti-join'],
    sources: [
      { author: 'SQLite', title: 'SELECT', url: 'https://www.sqlite.org/lang_select.html' },
    ],
    verified: '2026-08-02',
    cards: [
      { id: 'one', front: 'First?', back: 'Yes.' },
      { id: 'two', front: 'Second?', back: 'Also yes.' },
      { id: 'three', front: 'Third?', back: 'Still yes.' },
      { id: 'four', front: 'Fourth?', back: 'Yes again.' },
    ],
    ...overrides,
  });
}

/** The default deck's cards, so a test can edit one without restating four. */
function cards(edit: (card: { id: string; front: string; back: string }) => void): unknown[] {
  const parsed = JSON.parse(deck()) as { cards: { id: string; front: string; back: string }[] };
  const [first, ...rest] = parsed.cards;
  if (!first) throw new Error('the default deck lost its cards');
  edit(first);
  return [first, ...rest];
}

describe('decks', () => {
  it('has at least one', () => {
    // The loader validates as it reads, so getting here at all is the assertion.
    expect(decks.length).toBeGreaterThan(0);
  });

  it('orders decks without ties', () => {
    const orders = decks.map((entry) => entry.order);
    expect(new Set(orders).size).toBe(orders.length);
  });

  it('gives every deck a summary, a budget and a citation', () => {
    for (const entry of decks) {
      expect(entry.summary.trim(), entry.slug).not.toBe('');
      expect(entry.minutes, entry.slug).toBeGreaterThan(0);
      expect(entry.sources.length, entry.slug).toBeGreaterThan(0);
      expect(entry.verified, entry.slug).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('points every deck at a real handbook page', () => {
    for (const entry of decks) {
      expect(pageRefs.has(entry.page), `${entry.slug} page: ${entry.page}`).toBe(true);
    }
  });

  it('points every practise slug at a real problem or workout', () => {
    for (const entry of decks) {
      for (const slug of entry.practise) {
        expect(practisable.has(slug), `${entry.slug} practise: ${slug}`).toBe(true);
      }
    }
  });

  it('keeps every deck to one sitting', () => {
    for (const entry of decks) {
      expect(entry.cards.length, entry.slug).toBeGreaterThanOrEqual(MIN_CARDS);
      expect(entry.cards.length, entry.slug).toBeLessThanOrEqual(MAX_CARDS);
    }
  });

  it('gives every card two sides and a distinct kebab-case id', () => {
    for (const entry of decks) {
      const ids = new Set<string>();
      for (const card of entry.cards) {
        expect(card.front.trim(), `${entry.slug}/${card.id}`).not.toBe('');
        expect(card.back.trim(), `${entry.slug}/${card.id}`).not.toBe('');
        expect(card.id, `${entry.slug}/${card.id}`).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
        expect(ids.has(card.id), `${entry.slug} repeats card id ${card.id}`).toBe(false);
        ids.add(card.id);
      }
    }
  });

  it('keeps every card to one line and within its cap', () => {
    for (const entry of decks) {
      for (const card of entry.cards) {
        expect(card.front.includes('\n'), `${entry.slug}/${card.id} front`).toBe(false);
        expect(card.back.includes('\n'), `${entry.slug}/${card.id} back`).toBe(false);
        expect(card.front.length, `${entry.slug}/${card.id} front`).toBeLessThanOrEqual(MAX_FRONT);
        expect(card.back.length, `${entry.slug}/${card.id} back`).toBeLessThanOrEqual(MAX_BACK);
      }
    }
  });

  it('asks each question once, across every deck', () => {
    // Two cards drilling one distinction is the failure a deck drifts into,
    // and it costs the sitting twice: once writing it, once answering it.
    const seen = new Map<string, string>();
    for (const entry of decks) {
      for (const card of entry.cards) {
        const key = normaliseFront(card.front);
        const already = seen.get(key);
        expect(already, `${entry.slug}/${card.id} repeats ${already ?? ''}`).toBe(undefined);
        seen.set(key, `${entry.slug}/${card.id}`);
      }
    }
  });
});

describe('the deck validator', () => {
  it('accepts a well-formed deck', () => {
    expect(() => parseDeck(deck(), 'ok')).not.toThrow();
  });

  it('refuses a deck that is not JSON', () => {
    expect(() => parseDeck('{ nope', 'ok')).toThrow(/not valid JSON/);
  });

  it('refuses a deck whose slug does not match its directory', () => {
    expect(() => parseDeck(deck(), 'elsewhere')).toThrow(/declares slug/);
  });

  it('refuses a deck with no cards', () => {
    expect(() => parseDeck(deck({ cards: [] }), 'ok')).toThrow(/0 cards/);
  });

  it('refuses a deck with more cards than a sitting', () => {
    const many = Array.from({ length: MAX_CARDS + 1 }, (_, index) => ({
      id: `card-${index}`,
      front: `Question ${index}?`,
      back: `Answer ${index}.`,
    }));
    expect(() => parseDeck(deck({ cards: many }), 'ok')).toThrow(/13 cards/);
  });

  it('refuses a duplicate card id', () => {
    expect(() =>
      parseDeck(
        deck({
          cards: cards((card) => {
            card.id = 'two';
          }),
        }),
        'ok'
      )
    ).toThrow(/repeats the card id/);
  });

  it('refuses a card id that is not kebab-case', () => {
    expect(() =>
      parseDeck(
        deck({
          cards: cards((card) => {
            card.id = 'Not Kebab';
          }),
        }),
        'ok'
      )
    ).toThrow(/kebab-case/);
  });

  it('refuses a card with an empty back', () => {
    expect(() =>
      parseDeck(
        deck({
          cards: cards((card) => {
            card.back = '   ';
          }),
        }),
        'ok'
      )
    ).toThrow(/has no back/);
  });

  it('refuses a newline in a back', () => {
    expect(() =>
      parseDeck(
        deck({
          cards: cards((card) => {
            card.back = 'One.\nTwo.';
          }),
        }),
        'ok'
      )
    ).toThrow(/newline in its back/);
  });

  it('refuses a back over the cap', () => {
    expect(() =>
      parseDeck(
        deck({
          cards: cards((card) => {
            card.back = 'a'.repeat(MAX_BACK + 1);
          }),
        }),
        'ok'
      )
    ).toThrow(/over 400/);
  });

  it('refuses a deck naming no page', () => {
    expect(() => parseDeck(deck({ page: '  ' }), 'ok')).toThrow(/names no page/);
  });

  it('refuses a page ref that is not section/slug', () => {
    expect(() => parseDeck(deck({ page: 'what-a-join-does' }), 'ok')).toThrow(/not section\/slug/);
  });

  it('refuses a deck with nothing to practise', () => {
    expect(() => parseDeck(deck({ practise: [] }), 'ok')).toThrow(/nothing to practise/);
  });

  it('refuses a deck citing nothing', () => {
    expect(() => parseDeck(deck({ sources: [] }), 'ok')).toThrow(/cites no sources/);
  });

  it('refuses a missing verified date', () => {
    expect(() => parseDeck(deck({ verified: undefined }), 'ok')).toThrow(/verified/);
  });

  it('refuses a malformed verified date', () => {
    expect(() => parseDeck(deck({ verified: '2 August 2026' }), 'ok')).toThrow(/verified/);
  });
});
