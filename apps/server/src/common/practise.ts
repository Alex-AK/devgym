import type { HandbookPractiseLink } from '@hone/shared';

import type { AppDb } from '../db/client';
import { problems } from '../db/schema';
import { listManifests } from '../workouts/workout-content';

/**
 * A `practise` entry is a bare slug and the author should not have to say which
 * kind it is. Problems are looked up live so a link carries the title the
 * problem actually has; a slug resolving to neither is a content bug the safety
 * net catches before it ships, so it is dropped rather than shown as a dead
 * link.
 *
 * Shared by the handbook and by modules, which both end on "now go and use it".
 */
export function resolvePractiseLinks(db: AppDb, slugs: string[]): HandbookPractiseLink[] {
  if (slugs.length === 0) return [];

  const problemTitles = new Map(
    db
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
