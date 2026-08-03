import type { CardLibrary } from '@devgym/shared';
import { Controller, Get } from '@nestjs/common';

import { DecksService } from './decks.service';

/**
 * One route, and read-only. Cards are self-graded and nothing is written down,
 * so there is no attempt to post; nobody chooses a deck, so there is nothing to
 * list and no deck to fetch by slug.
 */
@Controller('decks')
export class DecksController {
  constructor(private readonly decks: DecksService) {}

  @Get('cards')
  cards(): CardLibrary {
    return this.decks.cards();
  }
}
