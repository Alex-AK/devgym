import type {
  HandbookPageDetail,
  HandbookPageRef,
  HandbookPageSummary,
  HandbookPractiseLink,
  HandbookSectionSummary,
} from '@devgym/shared';
import { Inject, Injectable, NotFoundException } from '@nestjs/common';

import type { AppDb } from '../db/client';
import { APP_DB } from '../db/db.module';
import { problems } from '../db/schema';
import { listManifests } from '../workouts/workout-content';
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
      practiseLinks: this.resolvePractise(page.practise),
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

  /**
   * A `practise` entry is a bare slug, and the author shouldn't have to say
   * which kind it is. Problems are looked up live so the link carries the title
   * the problem actually has; a slug that resolves to neither is a content bug
   * the safety net catches before it ships, so it's dropped rather than shown.
   */
  private resolvePractise(slugs: string[]): HandbookPractiseLink[] {
    if (slugs.length === 0) return [];

    const problemTitles = new Map(
      this.db
        .select({ slug: problems.slug, title: problems.title })
        .from(problems)
        .all()
        .map((row) => [row.slug, row.title] as const)
    );
    const workoutTitles = new Map(
      listManifests().map((manifest) => [manifest.slug, manifest.title] as const)
    );

    return slugs.flatMap<HandbookPractiseLink>((slug) => {
      const problem = problemTitles.get(slug);
      if (problem) return [{ kind: 'problem', slug, title: problem }];
      const workout = workoutTitles.get(slug);
      if (workout) return [{ kind: 'workout', slug, title: workout }];
      return [];
    });
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
