import type { HandbookPageDetail, HandbookSectionSummary } from '@devgym/shared';
import { Controller, Get, Param } from '@nestjs/common';

import { HandbookService } from './handbook.service';

@Controller('handbook')
export class HandbookController {
  constructor(private readonly handbook: HandbookService) {}

  @Get()
  sections(): HandbookSectionSummary[] {
    return this.handbook.sections();
  }

  @Get(':section/:slug')
  page(@Param('section') section: string, @Param('slug') slug: string): HandbookPageDetail {
    return this.handbook.page(section, slug);
  }
}
