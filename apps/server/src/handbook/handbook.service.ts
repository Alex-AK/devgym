import type {
  HandbookPageDetail,
  HandbookPageRef,
  HandbookPageSummary,
  HandbookSectionSummary,
} from '@hone/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import { resolvePractiseLinks } from '../common/practise';
import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { type HandbookPageContent, listPages, listSections, readSection } from './handbook-content';

@Injectable()
export class HandbookService {
  constructor(@Inject(APP_DB) private readonly db: AppDb) {}

  sections(): HandbookSectionSummary[] {
    return listSections().map((section) => ({
      slug: section.slug,
      title: section.title,
      summary: section.summary,
      pages: listPages(section.slug).map(toSummary),
    }));
  }

  page(section: string, slug: string): HandbookPageDetail {
    const meta = this.findSection(section);
    const pages = listPages(section);
    const index = pages.findIndex((page) => page.slug === slug);
    if (index === -1) throw new NotFoundException(`No handbook page ${section}/${slug}`);
    const page = pages[index] as HandbookPageContent;

    return {
      ...toSummary(page),
      sectionTitle: meta.title,
      body: page.body,
      sources: page.sources,
      verified: page.verified,
      practiseLinks: resolvePractiseLinks(this.db, page.practise),
      previous: toRef(pages[index - 1]),
      next: toRef(pages[index + 1]),
    };
  }

  private findSection(slug: string): { title: string } {
    try {
      return readSection(slug);
    } catch {
      throw new NotFoundException(`No handbook section ${slug}`);
    }
  }
}

function toSummary(page: HandbookPageContent): HandbookPageSummary {
  return {
    section: page.section,
    slug: page.slug,
    title: page.title,
    question: page.question,
    practise: page.practise,
  };
}

function toRef(page: HandbookPageContent | undefined): HandbookPageRef | null {
  return page ? { section: page.section, slug: page.slug, title: page.title } : null;
}
