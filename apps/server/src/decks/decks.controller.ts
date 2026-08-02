import type { DeckDetail, DeckSummary } from '@devgym/shared';
import { Controller, Get, Param } from '@nestjs/common';

import { DecksService } from './decks.service';

/**
 * Read-only, and that is the design rather than a first cut. Cards are
 * self-graded and nothing is written down, so there is no attempt to post.
 */
@Controller('decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get()
  list(): DeckSummary[] {
    return this.decks.list();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string): DeckDetail {
    return this.decks.detail(slug);
  }
}
