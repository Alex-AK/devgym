import { DIFFICULTIES, type HandbookPractiseLink } from '@hone/shared';

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

  const problemRows = new Map(
    db
      .select({ slug: problems.slug, title: problems.title, difficulty: problems.difficulty })
      .from(problems)
      .all()
      .map((row) => [row.slug, row] as const)
  );
  const workoutRows = new Map(
    listManifests().map((manifest) => [manifest.slug, manifest] as const)
  );

  const links = slugs.flatMap<HandbookPractiseLink>((slug) => {
    const problem = problemRows.get(slug);
    if (problem)
      return [{ kind: 'problem', slug, title: problem.title, difficulty: problem.difficulty }];
    const workout = workoutRows.get(slug);
    if (workout)
      return [{ kind: 'workout', slug, title: workout.title, difficulty: workout.difficulty }];
    return [];
  });

  return sortByWayIn(links);
}

/**
 * Easiest first, workouts last, and stable inside each group so an author's
 * ordering survives wherever it was deliberate. The list is read straight after
 * the page, when the useful question is "what can I attempt now" rather than
 * "what did the author list first" — and a workout is a twenty-minute
 * commitment whatever its difficulty, so it is never the way in.
 */
export function sortByWayIn(links: HandbookPractiseLink[]): HandbookPractiseLink[] {
  const rank = (link: HandbookPractiseLink): number =>
    (link.kind === 'workout' ? DIFFICULTIES.length : 0) + DIFFICULTIES.indexOf(link.difficulty);

  return links
    .map((link, index) => ({ link, index }))
    .sort((a, b) => rank(a.link) - rank(b.link) || a.index - b.index)
    .map((entry) => entry.link);
}
