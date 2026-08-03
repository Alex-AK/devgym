import type { CardDeck, CardLibrary, HandbookPageRef } from '@devgym/shared';
import { Inject, Injectable } from '@nestjs/common';

import { resolvePractiseLinks } from '../common/practise';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { allPages } from '../handbook/handbook-content';
import { listDecks } from './decks-content';

@Injectable()
export class DecksService {
  constructor(@Inject(APP_DB) private readonly db: AppDb) {}

  /**
   * Every card there is, plus the decks behind them, in one response. Cards
   * come back in deck order: the shuffle is the client's, because a run is a
   * client-side thing and shuffling here would leave a cached response serving
   * the same order back on the next visit.
   */
  cards(): CardLibrary {
    const decks = listDecks();
    return {
      cards: decks.flatMap((deck) => deck.cards.map((card) => ({ ...card, deck: deck.slug }))),
      decks: decks.map((deck): CardDeck => {
        return {
          slug: deck.slug,
          page: resolvePage(deck.page),
          practiseLinks: resolvePractiseLinks(this.db, deck.practise),
          sources: deck.sources,
          verified: deck.verified,
        };
      }),
    };
  }
}

/**
 * Resolved live, so the link carries the title the page actually has today. A
 * ref pointing at nothing is a content bug the safety net catches before it
 * ships, so it comes back null rather than as a dead link.
 */
function resolvePage(ref: string): HandbookPageRef | null {
  const page = allPages().find((one) => `${one.section}/${one.slug}` === ref);
  if (!page) return null;
  return { section: page.section, slug: page.slug, title: page.title };
}
