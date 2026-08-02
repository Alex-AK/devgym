import type { DeckDetail, DeckSummary, HandbookPageRef } from '@devgym/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { resolvePractiseLinks } from '../common/practise';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { allPages } from '../handbook/handbook-content';
import { type DeckContent, listDecks, readDeck } from './decks-content';

@Injectable()
export class DecksService {
  constructor(@Inject(APP_DB) private readonly db: AppDb) {}

  list(): DeckSummary[] {
    return listDecks().map(toSummary);
  }

  detail(slug: string): DeckDetail {
    const content = this.require(slug);
    return {
      ...toSummary(content),
      cards: content.cards,
      page: resolvePage(content.page),
      practiseLinks: resolvePractiseLinks(this.db, content.practise),
      sources: content.sources,
      verified: content.verified,
    };
  }

  private require(slug: string): DeckContent {
    try {
      return readDeck(slug);
    } catch {
      throw new NotFoundException(`No deck ${slug}`);
    }
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

function toSummary(content: DeckContent): DeckSummary {
  return {
    slug: content.slug,
    title: content.title,
    summary: content.summary,
    order: content.order,
    minutes: content.minutes,
    cardCount: content.cards.length,
  };
}
